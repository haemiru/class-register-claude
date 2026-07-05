import { useSearchParams, Link } from 'react-router-dom'

// Design Ref: §6 — 토스 결제 실패 리다이렉트
export default function Fail() {
  const [params] = useSearchParams()
  const message = params.get('message') || '결제가 취소되었거나 실패했습니다.'

  return (
    <div className="space-y-4 py-10 text-center">
      <div className="text-5xl">❌</div>
      <h1 className="text-xl font-bold text-slate-800">결제가 완료되지 않았습니다</h1>
      <p className="mx-auto max-w-sm text-sm text-slate-500">{message}</p>
      <Link to="/" className="inline-block text-sm text-sage-dark transition hover:text-sage">
        클래스 목록으로 돌아가기
      </Link>
    </div>
  )
}
