import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { formatDateTime, formatBytes } from '../lib/format.js'

// Design Ref: §7 — 결제 완료자 전용 자료 페이지(개인 토큰 링크)
// /my?token=<access_token> — 토큰으로 클래스 자료 목록 조회 + 서명 URL 다운로드
export default function My() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState('loading') // loading|done|error
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/my?token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          setState('error')
          return
        }
        setData(await res.json())
        setState('done')
      } catch {
        setState('error')
      }
    })()
  }, [token])

  function download(matId) {
    // 서버 스트리밍 프록시로 직접 이동 → 원본(한글) 파일명으로 저장
    window.location.href = `/api/download?token=${encodeURIComponent(token)}&id=${matId}`
  }

  if (state === 'loading')
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        <span className="animate-pulse">자료를 불러오는 중…</span>
      </p>
    )

  if (state === 'error')
    return (
      <div className="space-y-4 py-10 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-slate-800">자료에 접근할 수 없습니다</h1>
        <p className="mx-auto max-w-sm text-sm text-slate-500">
          링크가 올바르지 않거나 결제가 완료되지 않은 신청입니다. 결제 완료 화면의 링크로 다시 접속해 주세요.
        </p>
        <Link to="/" className="inline-block text-sm text-sage-dark transition hover:text-sage">
          클래스 목록으로
        </Link>
      </div>
    )

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-slate-800">
          내 <span className="text-gradient">클래스 자료</span>
        </h1>
        {data?.class && (
          <p className="mt-2 text-sm text-slate-500">
            {data.class.title}
            {data.class.starts_at && ` · ${formatDateTime(data.class.starts_at)}`}
          </p>
        )}
      </div>

      <div className="glass mx-auto max-w-lg p-6">
        {(!data?.materials || data.materials.length === 0) ? (
          <p className="py-6 text-center text-sm text-slate-500">아직 등록된 자료가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{m.file_name}</div>
                  {m.size != null && <div className="text-xs text-slate-500">{formatBytes(m.size)}</div>}
                </div>
                <button
                  onClick={() => download(m.id)}
                  className="btn-gradient shrink-0 rounded-lg px-4 py-2 text-sm"
                >
                  다운로드
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-slate-500">
        이 페이지 주소를 저장해 두면 클래스 당일에도 자료를 다시 받을 수 있습니다.
      </p>
    </div>
  )
}
