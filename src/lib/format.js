// 공용 포맷 헬퍼
export const won = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 토스 orderId 생성 (Date.now 사용 가능한 브라우저 런타임)
export function makeOrderId() {
  return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
