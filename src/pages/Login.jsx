import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import Field, { inputCls } from '../components/Field.jsx'
import { signInEmail, signUpEmail, signInKakao } from '../lib/authApi.js'

// Design Ref: §8 — 참가자 로그인/회원가입. 이메일+비밀번호 & 카카오.
export default function Login() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/account'
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function friendly(err) {
    const msg = String(err?.message || '')
    if (/Invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    if (/already registered|already exists/i.test(msg)) return '이미 가입된 이메일입니다. 로그인해 주세요.'
    if (/at least 6|password should be/i.test(msg)) return '비밀번호는 6자 이상이어야 합니다.'
    if (/valid email|invalid email/i.test(msg)) return '이메일 형식을 확인해 주세요.'
    return mode === 'signup' ? '회원가입에 실패했습니다.' : '로그인에 실패했습니다.'
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const { data, error } = mode === 'signup'
        ? await signUpEmail(email, password)
        : await signInEmail(email, password)
      if (error) {
        setError(friendly(error))
        setSubmitting(false)
        return
      }
      // 'Confirm email' 끔 → signUp 도 즉시 세션. 혹시 세션이 없으면(확인메일 켜짐) 안내.
      if (!data?.session) {
        setError('가입 확인 메일을 보냈습니다. 메일의 링크를 눌러 인증한 뒤 로그인해 주세요.')
        setMode('login')
        setSubmitting(false)
        return
      }
      nav(next, { replace: true })
    } catch (err) {
      setError(friendly(err))
      setSubmitting(false)
    }
  }

  async function onKakao() {
    setError('')
    try {
      await signInKakao(next)
      // 카카오 리다이렉트 → 복귀는 next 경로로. 여기 이후 코드는 실행되지 않음.
    } catch {
      setError('카카오 로그인을 시작하지 못했습니다.')
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-slate-800">
          {mode === 'login' ? '로그인' : '회원가입'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          클래스 신청과 자료 확인을 위해 계정이 필요합니다.
        </p>
      </div>

      <div className="glass space-y-4 p-6">
        {/* 카카오 로그인 */}
        <button
          type="button"
          onClick={onKakao}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 font-semibold text-[#191600] transition hover:brightness-95"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M12 3C6.99 3 3 6.13 3 9.99c0 2.5 1.68 4.7 4.2 5.94-.18.63-.66 2.3-.76 2.66-.12.45.17.44.35.32.14-.09 2.26-1.53 3.18-2.16.66.1 1.34.15 2.03.15 5.01 0 9-3.13 9-6.99S17.01 3 12 3Z" />
          </svg>
          카카오로 계속하기
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> 또는 이메일 <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* 이메일+비밀번호 */}
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="이메일" required>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              autoComplete="email"
            />
          </Field>
          <Field label="비밀번호" required hint={mode === 'signup' ? '6자 이상' : undefined}>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </Field>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-gradient w-full rounded-xl py-3">
            {submitting ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          {mode === 'login' ? (
            <>
              계정이 없으신가요?{' '}
              <button type="button" onClick={() => { setMode('signup'); setError('') }} className="font-semibold text-sage-dark underline">
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <button type="button" onClick={() => { setMode('login'); setError('') }} className="font-semibold text-sage-dark underline">
                로그인
              </button>
            </>
          )}
        </p>
      </div>

      <p className="text-center">
        <Link to="/" className="text-sm text-slate-400 hover:text-sage">← 클래스 목록으로</Link>
      </p>
    </div>
  )
}
