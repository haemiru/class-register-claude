import { createClient } from '@supabase/supabase-js'
// Design Ref: §5, §10 — 관리자 인증: Supabase Auth access_token 검증 + 허용목록.
// 판별 기준 두 가지(둘 중 하나만 맞으면 관리자):
//   ADMIN_EMAILS    쉼표 구분 이메일(구글 로그인 등 이메일이 확실할 때)
//   ADMIN_USER_IDS  쉼표 구분 Supabase user id(카카오처럼 이메일이 없을/다를 수 있을 때)

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// 쉼표로 구분된 환경변수를 배열로 (trim + 빈값 제거)
function csv(name) {
  return (process.env[name] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isAdminEmail(email) {
  if (!email) return false
  return csv('ADMIN_EMAILS')
    .map((e) => e.toLowerCase())
    .includes(String(email).toLowerCase())
}

export function isAdminUserId(id) {
  if (!id) return false
  return csv('ADMIN_USER_IDS').includes(String(id))
}

// 이메일 또는 user id 중 하나라도 허용목록에 있으면 관리자
export function isAdminUser(user) {
  return isAdminEmail(user?.email) || isAdminUserId(user?.id)
}

// Bearer 토큰(=Supabase access_token) 검증 → 사용자 반환(없으면 null)
async function getUserFromToken(token) {
  if (!token || !url || !anonKey) return null
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// Bearer 토큰에서 로그인 사용자 반환(가드 없이, 없으면 null). 참가자 신청↔계정 연결용.
export async function getAuthUser(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  return getUserFromToken(token)
}

// 관리자 라우트 가드. 유효 토큰 + 허용 이메일이면 true, 아니면 401/403 응답 후 false.
export async function requireAdmin(req, res) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const user = await getUserFromToken(token)
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return false
  }
  if (!isAdminUser(user)) {
    res.status(403).json({ error: 'FORBIDDEN' })
    return false
  }
  return true
}
