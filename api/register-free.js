import { randomUUID } from 'node:crypto'
import { getAdminClient } from './_lib/supabaseAdmin.js'

// Design Ref: §7 — 무료 강의(fee=0) 신청. 토스는 0원 결제 불가 → 결제 없이 바로 확정.
// 정원/마감 검증은 결제 경로와 동일하게 classregi_register_paid 트랜잭션 RPC 재사용.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const { classId, name, phone, email, note, form_data } = req.body || {}
  if (!classId || !name || !phone || !email) return res.status(400).json({ error: 'INVALID_INPUT' })

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  // 강의 확인 + 무료/오픈 검증 (클라이언트 신뢰 금지)
  const { data: cls, error: clsErr } = await supabase
    .from('classregi_classes')
    .select('id, fee, status')
    .eq('id', classId)
    .single()
  if (clsErr || !cls) return res.status(404).json({ error: 'CLASS_NOT_FOUND' })
  if (Number(cls.fee) !== 0) return res.status(400).json({ error: 'NOT_FREE' }) // 유료는 결제 경로로
  if (cls.status !== 'open') return res.status(409).json({ error: 'CLOSED' })

  // 정원 확인 + 신청 확정 (결제 없이 paid 처리)
  const { data: reg, error: rpcErr } = await supabase.rpc('classregi_register_paid', {
    p_class_id: classId,
    p_name: name,
    p_phone: phone,
    p_payment_key: null,
    p_order_id: `free_${randomUUID()}`,
    p_amount: 0,
    p_note: note ? String(note).slice(0, 500) : null,
    p_email: email ? String(email).slice(0, 200) : null,
    p_form_data: form_data && typeof form_data === 'object' ? form_data : {},
  })

  if (rpcErr) {
    if (String(rpcErr.message || '').includes('FULL')) return res.status(409).json({ error: 'FULL' })
    return res.status(500).json({ error: 'REGISTRATION_FAILED' })
  }

  const registration = Array.isArray(reg) ? reg[0] : reg
  return res.status(200).json({ registration })
}
