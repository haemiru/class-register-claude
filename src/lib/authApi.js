// Design Ref: §8 — 참가자 계정(Supabase Auth). 이메일+비밀번호 & 카카오 로그인.
// 관리자(Google)와 같은 Supabase Auth 세션을 공유하되, 참가자용 진입점만 분리.
import { supabase } from './supabase.js'

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

// 서버리스 호출에 실을 access_token (없으면 null)
export async function getAccessToken() {
  const session = await getSession()
  return session?.access_token || null
}

// 인증 상태 변화 구독 (로그인/로그아웃/OAuth 복귀 감지)
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

// 이메일+비밀번호 회원가입 (Supabase 'Confirm email' 끔 → 즉시 세션 생성)
export function signUpEmail(email, password) {
  return supabase.auth.signUp({ email: email.trim(), password })
}

// 이메일+비밀번호 로그인
export function signInEmail(email, password) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password })
}

// 카카오 로그인 → 완료 후 next 경로(기본 /account)로 복귀
export function signInKakao(next = '/account') {
  return supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${window.location.origin}${next}` },
  })
}

export async function signOut() {
  await supabase.auth.signOut()
}

// 로그인 사용자의 신청 목록 (RPC, auth.uid() 기준)
export async function myRegistrations() {
  const { data, error } = await supabase.rpc('classregi_my_registrations')
  if (error) throw error
  return data || []
}
