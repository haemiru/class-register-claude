import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi, getSession, signOut } from '../../lib/adminApi.js'
import Field, { inputCls } from '../../components/Field.jsx'
import { won, formatDateTime } from '../../lib/format.js'

// Design Ref: §6 — 관리자 강의 관리: 등록 폼 + 목록(수정/마감)
const empty = { title: '', description: '', location: '', starts_at: '', capacity: 20, fee: 0 }

export default function AdminClasses() {
  const nav = useNavigate()
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!(await getSession())) {
        nav('/admin')
        return
      }
      load()
    })()
  }, [])

  async function load() {
    try {
      const { classes } = await adminApi.listClasses()
      setClasses(classes)
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        await signOut()
        nav('/admin')
      } else setError('목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    setError('')
    if (!form.title || !form.location || !form.starts_at) {
      setError('제목·장소·일시는 필수입니다.')
      return
    }
    setSaving(true)
    try {
      await adminApi.createClass({
        ...form,
        capacity: Number(form.capacity),
        fee: Number(form.fee),
        // datetime-local → ISO
        starts_at: new Date(form.starts_at).toISOString(),
      })
      setForm(empty)
      await load()
    } catch {
      setError('강의 등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(c) {
    const next = c.status === 'open' ? 'closed' : 'open'
    await adminApi.updateClass(c.id, { status: next })
    await load()
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">강의 관리</h1>
        <button
          onClick={async () => {
            await signOut()
            nav('/admin')
          }}
          className="text-sm text-slate-500 hover:text-accent"
        >
          로그아웃
        </button>
      </div>

      {/* 등록 폼 */}
      <form onSubmit={onCreate} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-800">새 강의 등록</h2>
        <Field label="강의 주제/제목" required>
          <input className={inputCls} value={form.title} onChange={set('title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="일시" required>
            <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={set('starts_at')} />
          </Field>
          <Field label="장소" required>
            <input className={inputCls} value={form.location} onChange={set('location')} />
          </Field>
          <Field label="정원(명)" required>
            <input type="number" min="1" className={inputCls} value={form.capacity} onChange={set('capacity')} />
          </Field>
          <Field label="참가비(원)" required>
            <input type="number" min="0" className={inputCls} value={form.fee} onChange={set('fee')} />
          </Field>
        </div>
        <Field label="설명">
          <textarea rows="3" className={inputCls} value={form.description} onChange={set('description')} />
        </Field>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? '등록 중…' : '강의 등록'}
        </button>
      </form>

      {/* 목록 */}
      <section>
        <h2 className="mb-3 font-bold text-slate-200">등록된 강의</h2>
        {loading ? (
          <p className="text-slate-400">불러오는 중…</p>
        ) : classes.length === 0 ? (
          <p className="text-slate-400">아직 등록된 강의가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {classes.map((c) => (
              <div key={c.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {formatDateTime(c.starts_at)} · {c.location} · 정원 {c.capacity}명 · {won(c.fee)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'open' ? 'bg-brand-light text-brand' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {c.status === 'open' ? '모집중' : '마감'}
                  </span>
                </div>
                <div className="mt-3 flex gap-3 text-sm">
                  <Link to={`/admin/classes/${c.id}`} className="text-brand underline">
                    신청자 보기
                  </Link>
                  <button onClick={() => toggleStatus(c)} className="text-slate-500 underline">
                    {c.status === 'open' ? '마감 처리' : '재오픈'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
