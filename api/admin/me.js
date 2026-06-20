import { requireAdmin } from '../_lib/auth.js'

// Design Ref: §5 — 현재 세션이 관리자 권한인지 확인 (프론트 로그인 후 검증용)
export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return
  return res.status(200).json({ ok: true })
}
