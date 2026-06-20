import { useSearchParams, Link } from 'react-router-dom'

// Design Ref: §6 — 토스 결제 실패 리다이렉트
export default function Fail() {
  const [params] = useSearchParams()
  const message = params.get('message') || '결제가 취소되었거나 실패했습니다.'

  return (
    <div className="space-y-4 text-center">
      <div className="text-4xl">❌</div>
      <h1 className="text-xl font-bold text-slate-900">결제가 완료되지 않았습니다</h1>
      <p className="text-sm text-slate-600">{message}</p>
      <Link to="/" className="inline-block text-sm text-brand underline">
        강의 목록으로 돌아가기
      </Link>
    </div>
  )
}
