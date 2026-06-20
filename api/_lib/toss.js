// Design Ref: §7, §9 — 토스 결제 승인/취소. secretKey 는 서버 환경변수 전용.
const TOSS_BASE = 'https://api.tosspayments.com/v1'

function authHeader() {
  const secret = process.env.TOSS_SECRET_KEY
  if (!secret) throw new Error('SERVER_MISCONFIG: TOSS_SECRET_KEY 미설정')
  // Basic base64(secretKey:)  ← 콜론 뒤 비밀번호 없음
  const token = Buffer.from(`${secret}:`).toString('base64')
  return `Basic ${token}`
}

// 결제 승인 — 위변조 방지를 위해 서버에서 최종 확정.
export async function confirmPayment({ paymentKey, orderId, amount }) {
  const res = await fetch(`${TOSS_BASE}/payments/confirm`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data?.message || 'TOSS_CONFIRM_FAILED')
    err.code = data?.code
    err.toss = data
    throw err
  }
  return data
}

// 결제 취소 — 정원 마감 등으로 신청 확정 불가 시 환불.
export async function cancelPayment({ paymentKey, reason }) {
  const res = await fetch(`${TOSS_BASE}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancelReason: reason || '신청 확정 실패' }),
  })
  return res.ok
}
