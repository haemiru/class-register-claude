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

  if (loading) return <p className="py-10 text-center text-slate-400">불러오는 중…</p>
  if (error)
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-rose-400">{error}</p>
        <Link to="/" className="text-sm text-violet-300 transition hover:text-cyan-300">
          ← 강의 목록으로
        </Link>
      </div>
    )

  const full = cls.paidCount >= cls.capacity
  const closed = cls.status === 'closed' || full

  return (
    <article className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-white">
        ← 강의 목록으로
      </Link>

      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold leading-snug text-white sm:text-3xl">{cls.title}</h1>
          {!closed && (
            <span className="mt-1 shrink-0 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
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
          <Chip className="font-mono font-bold text-white">
            {Number(cls.fee) === 0 ? '🎁 무료' : `💳 ${won(cls.fee)}`}
          </Chip>
        </div>
      </header>

      {cls.description && (
        <p className="glass whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-300">
          {cls.description}
        </p>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-2xl shadow-black/30 ring-1 ring-white/10">
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
      className={`inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 ${className}`}
    >
      {children}
    </span>
  )
}
