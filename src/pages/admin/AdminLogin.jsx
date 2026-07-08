import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, getSession, onAuthChange, signInWithKakao, signOut } from '../../lib/adminApi.js'
import { signInEmail, signUpEmail } from '../../lib/authApi.js'
import Field, { inputCls } from '../../components/Field.jsx'

// Design Ref: §5 — 관리자 로그인: 카카오 + 이메일/비밀번호. 허용목록(이메일 또는 고유 ID)이면 관리자 진입.
// 카카오톡 인앱브라우저에서도 로그인 가능(구글 OAuth는 인앱브라우저 차단이라 제외).
// 로그인 성공 시 세션 변화를 onAuthChange 가 감지 → evaluate() 가 권한 확인 후 이동.
export default function AdminLogin() {
  const nav = useNavigate()
  // checking | signedout | forbidden
  const [status, setStatus] = useState('checking')
  const [email, setEmail] = useState('') // forbidden 표시용(세션 계정)
  const [uid, setUid] = useState('')

  // 이메일+비밀번호 폼 상태
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [fEmail, setFEmail] = useState('')
  const [fPw, setFPw] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let active = true

    async function evaluate(session) {
      if (!active) return
      if (!session) {
        setStatus('signedout')
        return
      }
      setEmail(session.user?.email || '')
      setUid(session.user?.id || '')
      try {
        await adminApi.me()
        if (active) nav('/admin/classes')
      } catch (e) {
        if (!active) return
        if (e.status === 403) setStatus('forbidden')
        else {
          await signOut()
          setStatus('signedout')
        }
      }
    }

    // 1) 현재 세션 즉시 평가 2) 로그인/OAuth 복귀 후 세션 감지 시 재평가
    getSession().then(evaluate)
    const unsub = onAuthChange(evaluate)
    return () => {
      active = false
      unsub()
    }
  }, [nav])

  function friendly(err) {
    const msg = String(err?.message || '')
    if (/Invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.'
    if (/already registered|already exists/i.test(msg)) return '이미 가입된 이메일입니다. 로그인해 주세요.'
    if (/at least 6|password should be/i.test(msg)) return '비밀번호는 6자 이상이어야 합니다.'
    if (/valid email|invalid email/i.test(msg)) return '이메일 형식을 확인해 주세요.'
    return mode === 'signup' ? '비밀번호 설정에 실패했습니다.' : '로그인에 실패했습니다.'
  }

  async function onEmailSubmit(e) {
    e.preventDefault()
    if (!fEmail.trim() || !fPw) {
      setFormError('이메일과 비밀번호를 입력해 주세요.')
      return
    }
    setFormError('')
    setSubmitting(true)
    try {
      const { data, error } = mode === 'signup' ? await signUpEmail(fEmail, fPw) : await signInEmail(fEmail, fPw)
      if (error) {
        setFormError(friendly(error))
        setSubmitting(false)
        return
      }
      // 'Confirm email' 끔 → 가입도 즉시 세션 → onAuthChange 가 evaluate 실행(이동/권한확인).
      if (!data?.session) {
        setFormError('가입 확인 메일을 보냈습니다. 메일 인증 후 로그인해 주세요.')
        setMode('login')
        setSubmitting(false)
      }
      // 세션이 생기면 화면 전환은 evaluate 가 담당(여기서 nav 하지 않음).
    } catch (err) {
      setFormError(friendly(err))
      setSubmitting(false)
    }
  }

  async function onLogout() {
    await signOut()
    setStatus('signedout')
    setEmail('')
    setUid('')
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-bold text-slate-800">관리자 로그인</h1>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {status === 'checking' && <p className="text-slate-500">확인 중…</p>}

        {status === 'signedout' && (
          <>
            {/* 카카오 로그인 */}
            <button
              onClick={() => signInWithKakao()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] py-2.5 font-semibold text-[#191600] hover:brightness-95"
            >
              <KakaoIcon />
              카카오로 로그인
            </button>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> 또는 이메일 <span className="h-px flex-1 bg-slate-200" />
            </div>

            {/* 이메일+비밀번호 */}
            <form onSubmit={onEmailSubmit} className="space-y-3">
              <Field label="이메일" required>
                <input
                  type="email"
                  className={inputCls}
                  value={fEmail}
                  onChange={(e) => setFEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="비밀번호" required hint={mode === 'signup' ? '6자 이상' : undefined}>
                <input
                  type="password"
                  className={inputCls}
                  value={fPw}
                  onChange={(e) => setFPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </Field>
              {formError && <p className="text-sm text-rose-600">{formError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-sage py-2.5 font-semibold text-slate-800 hover:bg-sage-dark disabled:opacity-50"
              >
                {submitting ? '처리 중…' : mode === 'login' ? '로그인' : '비밀번호 설정(가입)'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500">
              {mode === 'login' ? (
                <>
                  처음이신가요?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setFormError('') }}
                    className="font-semibold text-sage-dark underline"
                  >
                    비밀번호 설정
                  </button>
                </>
              ) : (
                <>
                  이미 비밀번호가 있으신가요?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setFormError('') }}
                    className="font-semibold text-sage-dark underline"
                  >
                    로그인
                  </button>
                </>
              )}
            </p>
          </>
        )}

        {status === 'forbidden' && (
          <>
            <p className="text-sm text-rose-600">이 계정은 아직 관리자 권한이 없습니다.</p>
            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <p>아래 정보를 관리자에게 전달하면 권한을 추가해 드립니다.</p>
              <p>
                이메일: <strong className="break-all text-slate-700">{email || '(이메일 미제공)'}</strong>
              </p>
              <p>
                고유 ID: <strong className="break-all text-slate-700">{uid || '—'}</strong>
              </p>
            </div>
            <button onClick={onLogout} className="w-full rounded-lg bg-slate-100 py-2.5 font-semibold text-slate-700 hover:bg-slate-200">
              다른 계정으로 로그인
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#191600"
        d="M9 1.5C4.86 1.5 1.5 4.1 1.5 7.3c0 2.06 1.4 3.87 3.5 4.9-.15.53-.56 1.98-.64 2.29-.1.38.14.38.29.28.12-.08 1.86-1.26 2.62-1.78.4.06.81.09 1.23.09 4.14 0 7.5-2.6 7.5-5.8S13.14 1.5 9 1.5z"
      />
    </svg>
  )
}
