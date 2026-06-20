import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { adminApi, getSession, signOut } from '../../lib/adminApi.js'
import { won, formatDateTime } from '../../lib/format.js'

// Design Ref: §6 — 강의별 신청자 목록 (Plan SC-5)
const statusLabel = { paid: '결제완료', pending: '대기', failed: '실패' }

export default function AdminRegistrations() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState({ class: null, registrations: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      if (!(await getSession())) {
        nav('/admin')
        return
      }
      try {
        const res = await adminApi.listRegistrations(id)
        setData(res)
      } catch (e) {
        if (e.status === 401 || e.status === 403) {
          await signOut()
          nav('/admin')
        } else setError('신청자 목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const paid = data.registrations.filter((r) => r.payment_status === 'paid')

  return (
    <div className="space-y-5">
      <Link to="/admin/classes" className="text-sm text-brand underline">
        ← 강의 관리로
      </Link>
      <h1 className="text-xl font-bold text-slate-900">
        신청자 {data.class ? `· ${data.class.title}` : ''}
      </h1>
      {data.class && (
        <p className="text-sm text-slate-500">
          {formatDateTime(data.class.starts_at)} · 결제완료 {paid.length}/{data.class.capacity}명 · {won(data.class.fee)}
        </p>
      )}

      {loading ? (
        <p className="text-slate-400">불러오는 중…</p>
      ) : error ? (
        <p className="text-accent">{error}</p>
      ) : data.registrations.length === 0 ? (
        <p className="text-slate-400">아직 신청자가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">이름</th>
                <th className="px-4 py-2">연락처</th>
                <th className="px-4 py-2">결제</th>
                <th className="px-4 py-2">신청시각</th>
              </tr>
            </thead>
            <tbody>
              {data.registrations.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-2 text-slate-600">{r.phone}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        r.payment_status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {statusLabel[r.payment_status] || r.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{formatDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
