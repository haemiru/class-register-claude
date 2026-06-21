import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import ClassCard from '../components/ClassCard.jsx'

// Design Ref: §6 — 공개 강의 목록 (cr_open_classes RPC, 집계 포함)
export default function ClassList() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.rpc('cr_open_classes')
      if (error) setError('강의 목록을 불러오지 못했습니다.')
      else setClasses((data || []).map((c) => ({ ...c, paidCount: Number(c.paid_count) })))
      setLoading(false)
    })()
  }, [])

  if (loading) return <p className="py-10 text-center text-slate-400">불러오는 중…</p>
  if (error) return <p className="py-10 text-center text-rose-400">{error}</p>

  return (
    <div className="space-y-12">
      {/* 히어로 */}
      <section className="space-y-5 pt-6 text-center sm:pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-cyan-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" /> LIVE 모집중
        </span>
        <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-5xl">
          코딩, <span className="text-gradient">바이브</span>로<br className="sm:hidden" /> 시작하세요
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
          AI와 함께 만들고 배포까지. 비개발자도 직접 만드는<br className="hidden sm:block" />
          실전 바이브 코딩 클래스.
        </p>
      </section>

      {/* 강의 목록 */}
      <section>
        <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <span className="font-mono text-violet-400">$</span> 신청 가능한 강의
        </h2>
        {classes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-slate-500">
            현재 모집 중인 강의가 없습니다.
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
