import { Link } from 'react-router-dom'
import { won, formatDateTime } from '../lib/format.js'

// Design Ref: §6 — 공개 클래스 카드(글래스). 정원/마감 표시.
export default function ClassCard({ cls }) {
  const full = cls.paidCount >= cls.capacity
  const closed = cls.status === 'closed' || full

  return (
    <Link
      to={`/class/${cls.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-sage/50 hover:shadow-md"
    >
      {/* 호버 글로우 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sage/5 to-sky/10 opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-slate-800">{cls.title}</h3>
          {closed ? (
            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              마감
            </span>
          ) : (
            <span className="shrink-0 rounded-full border border-sage/20 bg-sage/10 px-2 py-0.5 text-xs font-medium text-sage-dark">
              모집중
            </span>
          )}
        </div>

        <dl className="space-y-1.5 text-sm text-slate-500">
          <div className="flex items-center gap-2">📅 {formatDateTime(cls.starts_at)}</div>
          <div className="flex items-center gap-2">📍 {cls.location}</div>
          <div className="flex items-center gap-2">
            👥 {cls.paidCount}/{cls.capacity}명
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-lg font-bold text-slate-800">{won(cls.fee)}</span>
          <span className="text-xs font-semibold text-sage-dark transition group-hover:text-coral">
            신청하기 →
          </span>
        </div>
      </div>
    </Link>
  )
}
