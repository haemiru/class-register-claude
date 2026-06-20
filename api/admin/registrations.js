import { getAdminClient } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/auth.js'

// Design Ref: §5 — GET /api/admin/registrations?classId=  (강의별 신청자 목록)
// Do 단계 결정: 중첩 동적 라우트 대신 query param 으로 단순화.
// Plan SC-5
export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const { classId } = req.query
  if (!classId) return res.status(400).json({ error: 'MISSING_CLASS_ID' })

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  const [{ data: cls }, { data: registrations, error }] = await Promise.all([
    supabase.from('cr_classes').select('id, title, starts_at, capacity, fee').eq('id', classId).single(),
    supabase
      .from('cr_registrations')
      .select('id, name, phone, note, payment_status, amount, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: true }),
  ])

  if (error) return res.status(500).json({ error: 'DB_ERROR' })
  return res.status(200).json({ class: cls || null, registrations: registrations || [] })
}
