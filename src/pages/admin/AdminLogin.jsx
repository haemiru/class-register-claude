import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, getSession, onAuthChange, signInWithGoogle, signOut } from '../../lib/adminApi.js'

// Design Ref: §5 — Google OAuth 로그인 → 허용 이메일이면 관리자 진입
export default function AdminLogin() {
  const nav = useNavigate()
  // checking | signedout | forbidden
  const [status, setStatus] = useState('checking')
  const [email, setEmail] = useState('')

  useEffect(() => {
    let active = true

    async function evaluate(session) {
      if (!active) return
      if (!session) {
        setStatus('signedout')
        return
      }
      setEmail(session.user?.email || '')
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

    // 1) 현재 세션 즉시 평가 2) OAuth 리다이렉트 후 세션 감지 시 재평가
    getSession().then(evaluate)
    const unsub = onAuthChange(evaluate)
    return () => {
      active = false
      unsub()
    }
  }, [nav])

  async function onLogout() {
    await signOut()
    setStatus('signedout')
    setEmail('')
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-bold text-slate-800">관리자 로그인</h1>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {status === 'checking' && <p className="text-slate-500">확인 중…</p>}

        {status === 'signedout' && (
          <>
            <p className="text-sm text-slate-500">관리자 권한이 있는 Google 계정으로 로그인하세요.</p>
            <button
              onClick={() => signInWithGoogle()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <GoogleIcon />
              Google로 로그인
            </button>
          </>
        )}

        {status === 'forbidden' && (
          <>
            <p className="text-sm text-rose-600">
              <strong>{email}</strong> 계정은 관리자 권한이 없습니다.
            </p>
            <button onClick={onLogout} className="w-full rounded-lg bg-slate-100 py-2.5 font-semibold text-slate-700 hover:bg-slate-200">
              다른 계정으로 로그인
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
