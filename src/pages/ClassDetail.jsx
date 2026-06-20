import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import RegistrationForm from '../components/RegistrationForm.jsx'
import { won, formatDateTime } from '../lib/format.js'

// Design Ref: §6 — 강의 상세 + 신청. 마감 시 신청 버튼 비활성(Plan SC-4)
export default function ClassDetail() {
  const { id } = useParams()
  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.rpc('cr_class_detail', { p_id: id })
      if (error || !data || data.length === 0) setError('강의를 찾을 수 없습니다.')
      else setCls({ ...data[0], paidCount: Number(data[0].paid_count) })
      setLoading(false)
    })()
  }, [id])

  if (loading) return <p className="text-slate-400">불러오는 중…</p>
  if (error)
    return (
      <div className="space-y-4">
        <p className="text-accent">{error}</p>
        <Link to="/" className="text-sm text-brand underline">
          ← 강의 목록으로
        </Link>
      </div>
    )

  const full = cls.paidCount >= cls.capacity
  const closed = cls.status === 'closed' || full

  return (
    <article className="space-y-6">
      <Link to="/" className="text-sm text-brand underline">
        ← 강의 목록으로
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">{cls.title}</h1>
        <div className="space-y-1 text-sm text-slate-600">
          <div>📅 {formatDateTime(cls.starts_at)}</div>
          <div>📍 {cls.location}</div>
          <div>
            👥 정원 {cls.paidCount}/{cls.capacity}명 · 💳 {won(cls.fee)}
          </div>
        </div>
      </header>

      {cls.description && (
        <p className="whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
          {cls.description}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">신청하기</h2>
        <RegistrationForm cls={cls} disabled={closed} />
      </section>
    </article>
  )
}
