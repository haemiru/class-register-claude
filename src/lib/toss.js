import { loadTossPayments } from '@tosspayments/payment-sdk'

// Design Ref: §7 — 토스 결제위젯 호출. 성공 시 /success 로 리다이렉트.
// 신청 내용은 결제 전에 /api/pre-register 로 이미 저장(pending)했으므로,
// successUrl 에는 개인정보를 싣지 않는다. 토스가 paymentKey/orderId/amount 를 자동 부착.
const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY

export async function requestCardPayment({ cls, orderId, name }) {
  if (!clientKey) throw new Error('VITE_TOSS_CLIENT_KEY 미설정 — .env를 확인하세요.')

  const origin = window.location.origin
  const toss = await loadTossPayments(clientKey)

  await toss.requestPayment('카드', {
    amount: cls.fee,
    orderId,
    orderName: cls.title,
    customerName: name,
    successUrl: `${origin}/success`,
    failUrl: `${origin}/fail`,
  })
}
