import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import ClassCard from '../components/ClassCard.jsx'

// Design Ref: §6 — 공개 클래스 목록 (cr_open_classes RPC, 집계 포함)
export default function ClassList() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.rpc('cr_open_classes')
      if (error) setError('클래스 목록을 불러오지 못했습니다.')
      else setClasses((data || []).map((c) => ({ ...c, paidCount: Number(c.paid_count) })))
      setLoading(false)
    })()
  }, [])

  if (loading) return <p className="py-10 text-center text-slate-500">불러오는 중…</p>
  if (error) return <p className="py-10 text-center text-rose-500">{error}</p>

  return (
    <div className="space-y-12">
      {/* 히어로 */}
      <section className="space-y-5 pt-6 text-center sm:pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-sage/20 bg-sage/10 px-3.5 py-1 text-xs font-semibold text-sage-dark">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sage" /> 지금 모집 중
        </span>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-800 sm:text-5xl">
          숨쉬고 느끼며 자라는<br className="sm:hidden" />{' '}
          <span className="text-gradient">브레인센트 클래스</span>
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
          뇌발달·호흡·후각을 함께 배우는<br className="hidden sm:block" />
          아이와 부모를 위한 감각 교육 클래스.
        </p>
      </section>

      {/* 클래스 목록 */}
      <section>
        <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span className="h-4 w-1.5 rounded-full bg-sage" /> 신청 가능한 클래스
        </h2>
        {classes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            현재 모집 중인 클래스가 없습니다.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => (
              <ClassCard key={c.id} cls={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
