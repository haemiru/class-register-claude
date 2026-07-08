import { getAdminClient } from '../../_lib/supabaseAdmin.js'
import { requireAdmin } from '../../_lib/auth.js'

// Design Ref: §5 — GET /api/admin/classes (목록) · POST (강의 등록)
// Plan SC-1
export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('classregi_classes')
      .select('*')
      .order('starts_at', { ascending: true })
    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(200).json({ classes: data })
  }

  if (req.method === 'POST') {
    const { title, description, location, starts_at, capacity, fee, form_type, form_schema } = req.body || {}
    if (!title || !location || !starts_at || !capacity) {
      return res.status(400).json({ error: 'INVALID_INPUT' })
    }
    const { data, error } = await supabase
      .from('classregi_classes')
      .insert({
        title,
        description: description || null,
        location,
        starts_at,
        capacity: Number(capacity),
        fee: Number(fee) || 0,
        status: 'open',
        form_type: form_type || 'baby',
        form_schema: Array.isArray(form_schema) ? form_schema : [],
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(201).json({ class: data })
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
}
