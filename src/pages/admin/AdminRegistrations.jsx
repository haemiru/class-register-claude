import { Fragment, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { adminApi, getSession, signOut } from '../../lib/adminApi.js'
import { won, formatDateTime } from '../../lib/format.js'
import { FORM_FIELDS } from '../../lib/formSchema.js'

// Design Ref: §6 — 클래스별 신청자 목록 (Plan SC-5)
const statusLabel = { paid: '결제완료', pending: '대기', failed: '실패', refunded: '환불됨' }

export default function AdminRegistrations() {
  const { id } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState({ class: null, registrations: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refunding, setRefunding] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())

  const toggleExpand = (rid) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(rid) ? next.delete(rid) : next.add(rid)
      return next
    })

  async function load() {
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
  }

  useEffect(() => {
    ;(async () => {
      if (!(await getSession())) {
        nav('/admin')
        return
      }
      await load()
    })()
  }, [id])

  async function onRefund(reg) {
    if (!confirm(`${reg.name} 님을 환불 처리할까요? 결제 건은 토스에서 취소되고, 한 자리가 다시 열립니다.`)) return
    setError('')
    setRefunding(reg.id)
    try {
      await adminApi.refundRegistration(reg.id)
      await load()
    } catch (e) {
      setError(e.status === 502 ? '토스 결제 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.' : '환불 처리에 실패했습니다.')
    } finally {
      setRefunding('')
    }
  }

  const paid = data.registrations.filter((r) => r.payment_status === 'paid')

  return (
    <div className="space-y-5">
      <Link to="/admin/classes" className="text-sm text-sage-dark underline">
        ← 클래스 관리로
      </Link>
      <h1 className="text-xl font-bold text-slate-800">
        신청자 {data.class ? `· ${data.class.title}` : ''}
      </h1>
      {data.class && (
        <p className="text-sm text-slate-500">
          {formatDateTime(data.class.starts_at)} · 결제완료 {paid.length}/{data.class.capacity}명 · {won(data.class.fee)}
        </p>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-slate-500">불러오는 중…</p>
      ) : data.registrations.length === 0 ? (
        <p className="text-slate-500">아직 신청자가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">이름</th>
                <th className="px-4 py-2">이메일</th>
                <th className="px-4 py-2">연락처</th>
                <th className="px-4 py-2">결제</th>
                <th className="px-4 py-2">신청시각</th>
                <th className="px-4 py-2">문진</th>
                <th className="px-4 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {data.registrations.map((r) => (
                <Fragment key={r.id}>
                  <tr className={`border-t ${r.payment_status === 'refunded' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2 text-slate-600">{r.email || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-2 text-slate-600">{r.phone}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          r.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.payment_status === 'refunded'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {statusLabel[r.payment_status] || r.payment_status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => toggleExpand(r.id)} className="text-xs text-sage-dark underline">
                        {expanded.has(r.id) ? '접기' : '보기'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      {r.payment_status === 'paid' ? (
                        <button
                          onClick={() => onRefund(r)}
                          disabled={refunding === r.id}
                          className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {refunding === r.id ? '처리 중…' : '환불'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                  {expanded.has(r.id) && (
                    <tr className="border-t bg-slate-50/60">
                      <td colSpan={7} className="px-4 py-3">
                        <FormDetail formData={r.form_data} note={r.note} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 신청 문진 상세(form_data)를 라벨과 함께 표시
function FormDetail({ formData, note }) {
  const fd = formData || {}
  const rows = FORM_FIELDS.map((f) => ({ label: f.label, value: fd[f.key], type: f.type })).filter(
    (r) => (Array.isArray(r.value) ? r.value.length > 0 : r.value !== '' && r.value != null),
  )

  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.length === 0 && note == null && (
        <p className="text-xs text-slate-400">문진 답변이 없습니다.</p>
      )}
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1">
          <dt className="text-xs font-semibold text-slate-500">{r.label}</dt>
          <dd className="text-sm text-slate-700">
            {Array.isArray(r.value) ? (
              <span className="flex flex-wrap gap-1">
                {r.value.map((v) => (
                  <span key={v} className="rounded-full bg-sage/10 px-2 py-0.5 text-xs text-sage-dark">
                    {v}
                  </span>
                ))}
              </span>
            ) : (
              <span className="whitespace-pre-wrap">{String(r.value)}</span>
            )}
          </dd>
        </div>
      ))}
      {note && (
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="text-xs font-semibold text-slate-500">사전 질문(레거시)</dt>
          <dd className="whitespace-pre-wrap text-sm text-slate-700">{note}</dd>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <dt className="text-xs font-semibold text-slate-500">개인정보 동의</dt>
        <dd className="text-sm text-slate-700">{fd.privacyConsent ? '동의함 ✅' : '—'}</dd>
      </div>
    </dl>
  )
}
