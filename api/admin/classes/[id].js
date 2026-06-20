import { getAdminClient } from '../../_lib/supabaseAdmin.js'
import { requireAdmin } from '../../_lib/auth.js'

// Design Ref: §5 — PATCH /api/admin/classes/:id (수정·마감)
const EDITABLE = ['title', 'description', 'location', 'starts_at', 'capacity', 'fee', 'status']

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const { id } = req.query
  const patch = {}
  for (const k of EDITABLE) {
    if (k in (req.body || {})) patch[k] = req.body[k]
  }
  if (patch.capacity != null) patch.capacity = Number(patch.capacity)
  if (patch.fee != null) patch.fee = Number(patch.fee)
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'NO_FIELDS' })

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  const { data, error } = await supabase
    .from('cr_classes')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: 'DB_ERROR' })
  return res.status(200).json({ class: data })
}
