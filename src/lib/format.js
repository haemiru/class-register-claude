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

// 연락처: 숫자만 추출 후 한국 전화번호 형식으로 '-' 자동 삽입
export function formatPhone(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (d.startsWith('02')) {
    // 서울 지역번호(02)
    if (d.length < 3) return d
    if (d.length < 6) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length < 10) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }
  // 휴대폰/일반(3자리 국번)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length < 11) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`
}

// 토스 orderId 생성 (Date.now 사용 가능한 브라우저 런타임)
export function makeOrderId() {
  return `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
