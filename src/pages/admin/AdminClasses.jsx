import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { adminApi, getSession, signOut, uploadMaterial } from '../../lib/adminApi.js'
import Field, { inputCls } from '../../components/Field.jsx'
import { won, formatDateTime, formatBytes, toDatetimeLocal } from '../../lib/format.js'

// Design Ref: §6 — 관리자 클래스 관리: 등록 폼 + 목록(수정/마감)
const empty = { title: '', description: '', location: '', starts_at: '', capacity: 20, fee: 0 }

export default function AdminClasses() {
  const nav = useNavigate()
  const [classes, setClasses] = useState([])
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState([]) // 등록 시 함께 올릴 자료(생성 후 업로드)
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
      // 1) 클래스 생성 → 2) 선택한 자료를 그 클래스로 업로드
      const { class: created } = await adminApi.createClass({
        ...form,
        capacity: Number(form.capacity),
        fee: Number(form.fee),
        // datetime-local → ISO
        starts_at: new Date(form.starts_at).toISOString(),
      })
      let uploadFailed = false
      for (const f of files) {
        try {
          await uploadMaterial(created.id, f)
        } catch {
          uploadFailed = true
        }
      }
      setForm(empty)
      setFiles([])
      await load()
      if (uploadFailed) {
        setError('클래스는 등록됐지만 일부 자료 업로드에 실패했습니다. 아래 클래스 카드에서 다시 추가해 주세요.')
      }
    } catch {
      setError('클래스 등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function onPickFiles(e) {
    const picked = Array.from(e.target.files || [])
    e.target.value = '' // 같은 파일 재선택 허용
    if (picked.length) setFiles((prev) => [...prev, ...picked])
  }
  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">클래스 관리</h1>
        <button
          onClick={async () => {
            await signOut()
            nav('/admin')
          }}
          className="text-sm text-slate-500 hover:text-sage"
        >
          로그아웃
        </button>
      </div>

      {/* 등록 폼 */}
      <form onSubmit={onCreate} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-800">새 클래스 등록</h2>
        <Field label="클래스 주제/제목" required>
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
        <Field label="클래스 자료 (선택)" hint="결제 완료자만 다운로드할 수 있습니다. 여러 개 가능.">
          <label className="inline-block cursor-pointer text-sm text-sage-dark underline">
            + 파일 선택
            <input type="file" multiple className="hidden" onChange={onPickFiles} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-slate-700">
                    {f.name}
                    <span className="ml-2 text-xs text-slate-500">{formatBytes(f.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-xs text-rose-600 underline"
                  >
                    제거
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          disabled={saving}
          className="rounded-lg bg-sage px-5 py-2.5 font-semibold text-slate-800 hover:bg-sage-dark disabled:opacity-50"
        >
          {saving ? '등록 중…' : '클래스 등록'}
        </button>
      </form>

      {/* 목록 */}
      <section>
        <h2 className="mb-3 font-bold text-slate-700">등록된 클래스</h2>
        {loading ? (
          <p className="text-slate-500">불러오는 중…</p>
        ) : classes.length === 0 ? (
          <p className="text-slate-500">아직 등록된 클래스가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {classes.map((c) => (
              <ClassCard key={c.id} c={c} onChanged={load} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// 클래스 카드: 조회/수정 토글 + 상태 변경 + 자료 관리
function ClassCard({ c, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function startEdit() {
    setForm({
      title: c.title,
      description: c.description || '',
      location: c.location,
      starts_at: toDatetimeLocal(c.starts_at),
      capacity: c.capacity,
      fee: c.fee,
    })
    setError('')
    setEditing(true)
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save(e) {
    e.preventDefault()
    if (!form.title || !form.location || !form.starts_at) {
      setError('제목·장소·일시는 필수입니다.')
      return
    }
    setSaving(true)
    try {
      await adminApi.updateClass(c.id, {
        title: form.title,
        description: form.description,
        location: form.location,
        starts_at: new Date(form.starts_at).toISOString(),
        capacity: Number(form.capacity),
        fee: Number(form.fee),
      })
      setEditing(false)
      await onChanged()
    } catch {
      setError('수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus() {
    await adminApi.updateClass(c.id, { status: c.status === 'open' ? 'closed' : 'open' })
    await onChanged()
  }

  async function onDelete() {
    if (!confirm(`"${c.title}" 클래스를 삭제할까요?\n신청 내역과 자료가 함께 삭제되며 되돌릴 수 없습니다.`)) return
    setError('')
    setDeleting(true)
    try {
      await adminApi.deleteClass(c.id)
      await onChanged()
    } catch (e) {
      // 결제 완료 신청자가 있으면 서버가 409(HAS_PAID) → 재확인 후 강제 삭제
      if (e.status === 409 && e.data?.error === 'HAS_PAID') {
        const n = e.data.paidCount
        if (confirm(`결제 완료된 신청자가 ${n ?? ''}명 있습니다.\n환불 없이 삭제하면 결제 기록도 사라집니다. 그래도 삭제할까요?`)) {
          try {
            await adminApi.deleteClass(c.id, { force: true })
            await onChanged()
            return
          } catch {
            setError('삭제에 실패했습니다.')
          }
        }
      } else {
        setError('삭제에 실패했습니다.')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <form onSubmit={save} className="space-y-3">
          <Field label="클래스 주제/제목" required>
            <input className={inputCls} value={form.title} onChange={set('title')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
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
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={saving}
              className="rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-sage-dark disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">{c.title}</div>
          <div className="mt-1 text-sm text-slate-500">
            {formatDateTime(c.starts_at)} · {c.location} · 정원 {c.capacity}명 · {won(c.fee)}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
            c.status === 'open' ? 'bg-sage/10 text-sage-dark' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {c.status === 'open' ? '모집중' : '마감'}
        </span>
      </div>
      <div className="mt-3 flex gap-3 text-sm">
        <Link to={`/admin/classes/${c.id}`} className="text-sage-dark underline">
          신청자 보기
        </Link>
        <button onClick={startEdit} className="text-slate-500 underline">
          수정
        </button>
        <button onClick={toggleStatus} className="text-slate-500 underline">
          {c.status === 'open' ? '마감 처리' : '재오픈'}
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="ml-auto text-rose-600 underline disabled:opacity-50"
        >
          {deleting ? '삭제 중…' : '삭제'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <MaterialManager classId={c.id} />
    </div>
  )
}

// 클래스별 자료 관리: 목록 + 업로드 + 삭제
function MaterialManager({ classId }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { materials } = await adminApi.listMaterials(classId)
        setMaterials(materials)
      } catch {
        setError('자료를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
  }, [classId])

  async function onUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일 재선택 허용
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { material } = await uploadMaterial(classId, file)
      setMaterials((prev) => [...prev, material])
    } catch {
      setError('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  async function onDelete(id) {
    if (!confirm('이 자료를 삭제할까요?')) return
    try {
      await adminApi.deleteMaterial(id)
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch {
      setError('삭제에 실패했습니다.')
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="mb-2 text-xs font-semibold text-slate-500">클래스 자료 (결제 완료자만 다운로드)</div>
      {loading ? (
        <p className="text-xs text-slate-500">불러오는 중…</p>
      ) : materials.length === 0 ? (
        <p className="text-xs text-slate-500">등록된 자료가 없습니다.</p>
      ) : (
        <ul className="space-y-1">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-700">
                {m.file_name}
                {m.size != null && <span className="ml-2 text-xs text-slate-500">{formatBytes(m.size)}</span>}
              </span>
              <button onClick={() => onDelete(m.id)} className="shrink-0 text-xs text-rose-600 underline">
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="mt-2 inline-block cursor-pointer text-sm text-sage-dark underline">
        {uploading ? '업로드 중…' : '+ 파일 추가'}
        <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
      </label>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}
