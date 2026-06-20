import crypto from 'node:crypto'
// Design Ref: §5, §10 — 관리자 인증: 단일 비밀번호 검증 → HMAC 서명 토큰(만료 포함)

const SECRET = process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || 'dev-secret'
const TTL_MS = 1000 * 60 * 60 * 8 // 8시간

function sign(payloadB64) {
  return crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url')
}

export function verifyPassword(input) {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) throw new Error('SERVER_MISCONFIG: ADMIN_PASSWORD 미설정')
  // 타이밍 안전 비교
  const a = Buffer.from(String(input || ''))
  const b = Buffer.from(pw)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export function issueToken() {
  const payload = { exp: Date.now() + TTL_MS }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${payloadB64}.${sign(payloadB64)}`
}

export function isValidToken(token) {
  if (!token || !token.includes('.')) return false
  const [payloadB64, sig] = token.split('.')
  if (sign(payloadB64) !== sig) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    return typeof exp === 'number' && Date.now() < exp
  } catch {
    return false
  }
}

// 관리자 라우트 가드. 유효하면 true, 아니면 401 응답 후 false.
export function requireAdmin(req, res) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!isValidToken(token)) {
    res.status(401).json({ error: 'UNAUTHORIZED' })
    return false
  }
  return true
}
