import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { formatDateTime, formatBytes } from '../lib/format.js'

// Design Ref: §7 — 결제 완료자 전용 자료 페이지(개인 토큰 링크)
// /my?token=<access_token> — 토큰으로 강의 자료 목록 조회 + 서명 URL 다운로드
export default function My() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState('loading') // loading|done|error
  const [data, setData] = useState(null)
  const [downloading, setDownloading] = useState('')

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

  async function download(matId) {
    setDownloading(matId)
    try {
      const res = await fetch(`/api/my?token=${encodeURIComponent(token)}&download=${matId}`)
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        alert('다운로드 링크를 받지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } catch {
      alert('다운로드에 실패했습니다.')
    } finally {
      setDownloading('')
    }
  }

  if (state === 'loading')
    return (
      <p className="py-16 text-center font-mono text-sm text-slate-400">
        <span className="animate-pulse">자료를 불러오는 중…</span>
      </p>
    )

  if (state === 'error')
    return (
      <div className="space-y-4 py-10 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-bold text-white">자료에 접근할 수 없습니다</h1>
        <p className="mx-auto max-w-sm text-sm text-slate-400">
          링크가 올바르지 않거나 결제가 완료되지 않은 신청입니다. 결제 완료 화면의 링크로 다시 접속해 주세요.
        </p>
        <Link to="/" className="inline-block text-sm text-violet-300 transition hover:text-cyan-300">
          강의 목록으로
        </Link>
      </div>
    )

  return (
    <div className="space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-white">
          내 <span className="text-gradient">강의 자료</span>
        </h1>
        {data?.class && (
          <p className="mt-2 text-sm text-slate-400">
            {data.class.title}
            {data.class.starts_at && ` · ${formatDateTime(data.class.starts_at)}`}
          </p>
        )}
      </div>

      <div className="glass mx-auto max-w-lg p-6">
        {(!data?.materials || data.materials.length === 0) ? (
          <p className="py-6 text-center text-sm text-slate-400">아직 등록된 자료가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{m.file_name}</div>
                  {m.size != null && <div className="text-xs text-slate-500">{formatBytes(m.size)}</div>}
                </div>
                <button
                  onClick={() => download(m.id)}
                  disabled={downloading === m.id}
                  className="btn-gradient shrink-0 rounded-lg px-4 py-2 text-sm disabled:opacity-50"
                >
                  {downloading === m.id ? '여는 중…' : '다운로드'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-slate-500">
        이 페이지 주소를 저장해 두면 강의 당일에도 자료를 다시 받을 수 있습니다.
      </p>
    </div>
  )
}
