import { getAdminClient } from './_lib/supabaseAdmin.js'
import { confirmPayment, cancelPayment } from './_lib/toss.js'

// Design Ref: §7 — 결제 승인 검증 → 정원 확인 → 신청 확정(paid)
// Plan SC-3 (서버 결제 검증) · SC-4 (정원 마감 차단) · SC-6 (키 비노출)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const { paymentKey, orderId, amount } = req.body || {}
  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: 'INVALID_INPUT' })
  }

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  try {
    // 0) pending 행 로드 (pre-register 에서 신청 내용을 미리 저장해 둠)
    const { data: existing } = await supabase
      .from('cr_registrations')
      .select('*')
      .eq('toss_order_id', orderId)
      .maybeSingle()
    if (!existing) return res.status(404).json({ error: 'ORDER_NOT_FOUND' })
    // 멱등성: 이미 확정된 주문이면 그대로 반환 (StrictMode/재시도 대비)
    if (existing.payment_status === 'paid') {
      return res.status(200).json({ registration: existing })
    }

    // 1) 금액 검증 (클라이언트/토스 amount 를 선저장된 pending 금액과 대조)
    if (Number(amount) !== Number(existing.amount)) {
      return res.status(400).json({ error: 'AMOUNT_MISMATCH' })
    }

    // 2) 토스 결제 승인 (서버 secretKey)
    await confirmPayment({ paymentKey, orderId, amount: Number(amount) })

    // 3) 정원 확인 + pending → paid 승격 (트랜잭션 RPC — 동시성 안전)
    const { data: reg, error: rpcErr } = await supabase.rpc('cr_confirm_paid', {
      p_order_id: orderId,
      p_payment_key: paymentKey,
      p_amount: Number(amount),
    })

    if (rpcErr) {
      // 정원 마감 레이스 → 결제 취소(환불) 후 409
      if (String(rpcErr.message || '').includes('FULL')) {
        await cancelPayment({ paymentKey, reason: '정원 마감' })
        return res.status(409).json({ error: 'FULL' })
      }
      // 그 외 → 결제 취소 후 500
      await cancelPayment({ paymentKey, reason: '신청 저장 실패' })
      return res.status(500).json({ error: 'REGISTRATION_FAILED' })
    }

    // rpc 반환은 단일 row (또는 배열)
    const registration = Array.isArray(reg) ? reg[0] : reg
    return res.status(200).json({ registration })
  } catch (err) {
    // 토스 승인 실패 등
    return res.status(400).json({ error: 'PAYMENT_CONFIRM_FAILED', detail: err?.code })
  }
}
