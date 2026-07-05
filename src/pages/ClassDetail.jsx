import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import RegistrationForm from '../components/RegistrationForm.jsx'
import { won, formatDateTime } from '../lib/format.js'

// Design Ref: §6 — 클래스 상세 + 신청. 마감 시 신청 버튼 비활성(Plan SC-4)
export default function ClassDetail() {
  const { id } = useParams()
  const [cls, setCls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.rpc('cr_class_detail', { p_id: id })
      if (error || !data || data.length === 0) setError('클래스를 찾을 수 없습니다.')
      else setCls({ ...data[0], paidCount: Number(data[0].paid_count) })
      setLoading(false)
    })()
  }, [id])

  if (loading) return <p className="py-10 text-center text-slate-500">불러오는 중…</p>
  if (error)
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-rose-500">{error}</p>
        <Link to="/" className="text-sm text-sage-dark transition hover:text-sage">
          ← 클래스 목록으로
        </Link>
      </div>
    )

  const full = cls.paidCount >= cls.capacity
  const closed = cls.status === 'closed' || full

  return (
    <article className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-sage">
        ← 클래스 목록으로
      </Link>

      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold leading-snug text-slate-800 sm:text-3xl">{cls.title}</h1>
          {!closed && (
            <span className="mt-1 shrink-0 rounded-full border border-sage/20 bg-sage/10 px-2.5 py-0.5 text-xs font-medium text-sage-dark">
              모집중
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Chip>📅 {formatDateTime(cls.starts_at)}</Chip>
          <Chip>📍 {cls.location}</Chip>
          <Chip>
            👥 {cls.paidCount}/{cls.capacity}명
          </Chip>
          <Chip className="font-bold text-slate-800">
            {Number(cls.fee) === 0 ? '🎁 무료' : `💳 ${won(cls.fee)}`}
          </Chip>
        </div>
      </header>

      {cls.description && (
        <p className="glass whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-600">
          {cls.description}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-bold text-slate-900">신청하기</h2>
        <p className="mb-5 text-xs text-slate-500">
          {Number(cls.fee) === 0
            ? '아래 정보를 입력하면 신청이 완료됩니다. (무료)'
            : '아래 정보를 입력하고 결제하면 신청이 완료됩니다.'}
        </p>
        <RegistrationForm cls={cls} disabled={closed} />
      </section>
    </article>
  )
}

function Chip({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 ${className}`}
    >
      {children}
    </span>
  )
}
