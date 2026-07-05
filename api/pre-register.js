import { randomUUID } from 'node:crypto'
import { getAdminClient } from './_lib/supabaseAdmin.js'

// Design Ref: §7 — 유료 결제 전, 신청 내용을 pending 행으로 선저장.
// 민감한 문진(form_data)을 URL에 싣지 않기 위해 결제 이전에 서버로 직접 저장하고,
// 결제 승인(/api/confirm-payment) 시 이 행을 paid 로 승격(classregi_confirm_paid)한다.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const { classId, name, phone, email, form_data } = req.body || {}
  if (!classId || !name || !phone || !email) return res.status(400).json({ error: 'INVALID_INPUT' })

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  // 클래스 확인 (유료·오픈만) — 클라이언트 금액 신뢰 금지
  const { data: cls, error: clsErr } = await supabase
    .from('classregi_classes')
    .select('id, fee, status, capacity')
    .eq('id', classId)
    .single()
  if (clsErr || !cls) return res.status(404).json({ error: 'CLASS_NOT_FOUND' })
  if (Number(cls.fee) <= 0) return res.status(400).json({ error: 'NOT_PAID' }) // 무료는 register-free 경로
  if (cls.status !== 'open') return res.status(409).json({ error: 'CLOSED' })

  // 사전 정원 확인(UX) — 이미 마감이면 결제 진입 차단. 최종 원자 검증은 confirm 단계.
  const { count: paidCount } = await supabase
    .from('classregi_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('payment_status', 'paid')
  if (paidCount != null && paidCount >= cls.capacity) return res.status(409).json({ error: 'FULL' })

  const orderId = `cr_${Date.now()}_${randomUUID().slice(0, 8)}`
  const { error: insErr } = await supabase.from('classregi_registrations').insert({
    class_id: classId,
    name: String(name).slice(0, 100),
    phone: String(phone).slice(0, 30),
    email: String(email).slice(0, 200),
    form_data: form_data && typeof form_data === 'object' ? form_data : {},
    payment_status: 'pending',
    toss_order_id: orderId,
    amount: cls.fee,
  })
  if (insErr) return res.status(500).json({ error: 'PRE_REGISTER_FAILED' })

  return res.status(200).json({ orderId, amount: cls.fee })
}
