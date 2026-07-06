import { getAdminClient } from '../../_lib/supabaseAdmin.js'
import { requireAdmin } from '../../_lib/auth.js'

// Design Ref: §5 — PATCH /api/admin/classes/:id (수정·마감) · DELETE (삭제)
const EDITABLE = ['title', 'description', 'location', 'starts_at', 'capacity', 'fee', 'status', 'form_type']
const BUCKET = 'classregi-materials'

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  const { id } = req.query

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  // ── 수정·마감 ─────────────────────────────────────────
  if (req.method === 'PATCH') {
    const patch = {}
    for (const k of EDITABLE) {
      if (k in (req.body || {})) patch[k] = req.body[k]
    }
    if (patch.capacity != null) patch.capacity = Number(patch.capacity)
    if (patch.fee != null) patch.fee = Number(patch.fee)
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'NO_FIELDS' })

    const { data, error } = await supabase
      .from('classregi_classes')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(200).json({ class: data })
  }

  // ── 삭제 ──────────────────────────────────────────────
  // registrations·materials 행은 on delete cascade 로 함께 삭제되지만
  // 스토리지 파일은 cascade 되지 않으므로 먼저 수동 정리한다.
  // 결제 완료(paid) 신청자가 있으면 실수 삭제 방지를 위해 409 → ?force=true 시에만 진행.
  if (req.method === 'DELETE') {
    const force = req.query.force === 'true' || req.query.force === '1'

    const { count: paidCount } = await supabase
      .from('classregi_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', id)
      .eq('payment_status', 'paid')
    if (!force && (paidCount || 0) > 0) {
      return res.status(409).json({ error: 'HAS_PAID', paidCount })
    }

    const { data: mats } = await supabase
      .from('classregi_materials')
      .select('storage_path')
      .eq('class_id', id)
    if (mats?.length) {
      await supabase.storage.from(BUCKET).remove(mats.map((m) => m.storage_path))
    }

    const { error } = await supabase.from('classregi_classes').delete().eq('id', id)
    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
}
