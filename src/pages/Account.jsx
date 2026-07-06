import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSession, myRegistrations, signOut } from '../lib/authApi.js'
import { formatDateTime, won } from '../lib/format.js'

// Design Ref: §8 — 내 신청 목록(로그인 전용). 자료는 access_token 으로 /my 재사용.
const statusLabel = { paid: '신청완료', pending: '결제 대기', failed: '실패', refunded: '환불됨' }

export default function Account() {
  const nav = useNavigate()
  const [state, setState] = useState('loading') // loading | done | error
  const [rows, setRows] = useState([])

  useEffect(() => {
    ;(async () => {
      const session = await getSession()
      if (!session) {
        nav('/login?next=/account', { replace: true })
        return
      }
      try {
        setRows(await myRegistrations())
        setState('done')
      } catch {
        setState('error')
      }
    })()
  }, [])

  if (state === 'loading') return <p className="py-16 text-center text-sm text-slate-500">불러오는 중…</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">
          내 <span className="text-gradient">신청 내역</span>
        </h1>
        <button
          onClick={async () => { await signOut(); nav('/') }}
          className="text-sm text-slate-500 hover:text-sage"
        >
          로그아웃
        </button>
      </div>

      {state === 'error' ? (
        <p className="text-sm text-rose-600">신청 내역을 불러오지 못했습니다.</p>
      ) : rows.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="text-sm text-slate-500">아직 신청한 클래스가 없습니다.</p>
          <Link to="/" className="mt-3 inline-block text-sm text-sage-dark underline">클래스 둘러보기</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="glass flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-800">{r.class_title}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {formatDateTime(r.starts_at)} · {r.amount ? won(r.amount) : '무료'} ·{' '}
                  <span className={r.payment_status === 'refunded' ? 'text-rose-500' : 'text-sage-dark'}>
                    {statusLabel[r.payment_status] || r.payment_status}
                  </span>
                </div>
              </div>
              {r.payment_status === 'paid' && (
                <Link
                  to={`/my?token=${r.access_token}`}
                  className="btn-gradient shrink-0 rounded-lg px-4 py-2 text-sm"
                >
                  자료 받기
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
