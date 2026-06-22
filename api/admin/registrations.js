import { getAdminClient } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/auth.js'
import { cancelPayment } from '../_lib/toss.js'

// Design Ref: §5 — 강의별 신청자 목록(GET) + 환불 처리(POST)
//   GET  ?classId=          : 신청자 목록
//   POST {registrationId}   : 환불(토스 결제 취소 + payment_status='refunded')
// 환불하면 paid 카운트가 줄어 정원이 다시 빔 → 마감(파생 표시)이 자동 해제됨.
export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  // ── 신청자 목록 ───────────────────────────────────────
  if (req.method === 'GET') {
    const { classId } = req.query
    if (!classId) return res.status(400).json({ error: 'MISSING_CLASS_ID' })

    const [{ data: cls }, { data: registrations, error }] = await Promise.all([
      supabase.from('cr_classes').select('id, title, starts_at, capacity, fee').eq('id', classId).single(),
      supabase
        .from('cr_registrations')
        .select('id, name, phone, note, payment_status, amount, created_at')
        .eq('class_id', classId)
        .order('created_at', { ascending: true }),
    ])

    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(200).json({ class: cls || null, registrations: registrations || [] })
  }

  // ── 환불 ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const { registrationId } = req.body || {}
    if (!registrationId) return res.status(400).json({ error: 'MISSING_ID' })

    const { data: reg } = await supabase
      .from('cr_registrations')
      .select('id, payment_status, toss_payment_key, amount')
      .eq('id', registrationId)
      .maybeSingle()
    if (!reg) return res.status(404).json({ error: 'NOT_FOUND' })
    if (reg.payment_status !== 'paid') return res.status(400).json({ error: 'NOT_REFUNDABLE' })

    // 유료 결제 건은 토스 취소(환불). 무료(payment_key 없음)는 건너뜀.
    if (reg.toss_payment_key) {
      const ok = await cancelPayment({ paymentKey: reg.toss_payment_key, reason: '관리자 환불' })
      if (!ok) return res.status(502).json({ error: 'TOSS_CANCEL_FAILED' })
    }

    const { data: updated, error } = await supabase
      .from('cr_registrations')
      .update({ payment_status: 'refunded' })
      .eq('id', registrationId)
      .select('id, name, phone, note, payment_status, amount, created_at')
      .single()
    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(200).json({ registration: updated })
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
}
