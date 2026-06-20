import { verifyPassword, issueToken } from '../_lib/auth.js'

// Design Ref: §5 — 단일 비밀번호 → 토큰 발급
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  const { password } = req.body || {}
  try {
    if (!verifyPassword(password)) return res.status(401).json({ error: 'INVALID_PASSWORD' })
    return res.status(200).json({ token: issueToken() })
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }
}
