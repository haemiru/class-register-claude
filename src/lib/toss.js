import { loadTossPayments } from '@tosspayments/payment-sdk'
import { makeOrderId } from './format.js'

// Design Ref: §7 — 토스 결제위젯 호출. 성공 시 /success 로 리다이렉트.
const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY

export async function requestCardPayment({ cls, name, phone }) {
  if (!clientKey) throw new Error('VITE_TOSS_CLIENT_KEY 미설정 — .env를 확인하세요.')

  const orderId = makeOrderId()
  // 신청 정보를 successUrl 쿼리로 전달 (서버에서 재검증)
  const params = new URLSearchParams({
    classId: cls.id,
    name,
    phone,
  })
  const origin = window.location.origin
  const toss = await loadTossPayments(clientKey)

  await toss.requestPayment('카드', {
    amount: cls.fee,
    orderId,
    orderName: cls.title,
    customerName: name,
    successUrl: `${origin}/success?${params.toString()}`,
    failUrl: `${origin}/fail`,
  })
}
