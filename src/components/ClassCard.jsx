import { Link } from 'react-router-dom'
import { won, formatDateTime } from '../lib/format.js'

// Design Ref: §6 — 공개 강의 카드. 정원/마감 표시.
export default function ClassCard({ cls }) {
  const full = cls.paidCount >= cls.capacity
  const closed = cls.status === 'closed' || full

  return (
    <Link
      to={`/class/${cls.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand hover:shadow"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{cls.title}</h3>
        {closed ? (
          <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
            마감
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-xs text-brand">
            모집중
          </span>
        )}
      </div>
      <dl className="space-y-1 text-sm text-slate-600">
        <div>📅 {formatDateTime(cls.starts_at)}</div>
        <div>📍 {cls.location}</div>
        <div>
          👥 {cls.paidCount}/{cls.capacity}명 · 💳 {won(cls.fee)}
        </div>
      </dl>
    </Link>
  )
}
