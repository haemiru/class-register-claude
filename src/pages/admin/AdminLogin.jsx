import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, setToken } from '../../lib/adminApi.js'
import Field, { inputCls } from '../../components/Field.jsx'

// Design Ref: §5 — 단일 비밀번호 로그인 → HMAC 토큰
export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token } = await adminApi.login(password)
      setToken(token)
      nav('/admin/classes')
    } catch {
      setError('비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-bold text-slate-900">관리자 로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <Field label="관리자 비밀번호" required>
          <input
            type="password"
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? '확인 중…' : '로그인'}
        </button>
      </form>
    </div>
  )
}
