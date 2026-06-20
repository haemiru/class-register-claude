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

  if (loading) return <p className="text-slate-400">불러오는 중…</p>
  if (error) return <p className="text-accent">{error}</p>

  return (
    <section>
      <h1 className="mb-4 text-xl font-bold text-slate-900">신청 가능한 강의</h1>
      {classes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-400">
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
  )
}
