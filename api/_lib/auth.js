import { createClient } from '@supabase/supabase-js'
// Design Ref: §5, §10 — 관리자 인증: Google OAuth(Supabase Auth) access_token 검증 + 이메일 허용목록(ADMIN_EMAILS)

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// 쉼표로 구분된 관리자 이메일 목록 (소문자 비교)
function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email) {
  if (!email) return false
  return adminEmails().includes(String(email).toLowerCase())
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

// 관리자 라우트 가드. 유효 토큰 + 허용 이메일이면 true, 아니면 401/403 응답 후 false.
export async function requireAdmin(req, res) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const user = await getUserFromToken(token)
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return false
  }
  if (!isAdminEmail(user.email)) {
    res.status(403).json({ error: 'FORBIDDEN' })
    return false
  }
  return true
}
