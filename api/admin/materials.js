import { randomUUID } from 'node:crypto'
import { getAdminClient } from '../_lib/supabaseAdmin.js'
import { requireAdmin } from '../_lib/auth.js'

// Design Ref: §4, §5 — 강의 자료 관리(관리자 전용)
//   GET    ?classId=        : 강의별 자료 목록
//   POST   {action:'sign'}  : 서명된 업로드 URL 발급(서버리스 4.5MB 제한 회피)
//   POST   {action:'confirm'}: 업로드 완료된 파일을 cr_materials 에 기록
//   DELETE ?id=             : 자료 삭제(스토리지 객체 + 행)
const BUCKET = 'cr-materials'

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  // ── 목록 ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { classId } = req.query
    if (!classId) return res.status(400).json({ error: 'MISSING_CLASS_ID' })
    const { data, error } = await supabase
      .from('cr_materials')
      .select('id, file_name, size, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(200).json({ materials: data || [] })
  }

  // ── 업로드 2단계(sign → confirm) ──────────────────────
  if (req.method === 'POST') {
    const { action } = req.body || {}

    if (action === 'sign') {
      const { classId, fileName } = req.body || {}
      if (!classId || !fileName) return res.status(400).json({ error: 'INVALID_INPUT' })
      // 강의 존재 확인
      const { data: cls } = await supabase.from('cr_classes').select('id').eq('id', classId).single()
      if (!cls) return res.status(404).json({ error: 'CLASS_NOT_FOUND' })
      const safe = String(fileName).replace(/[^\w.\-가-힣 ]/g, '_').slice(0, 120)
      const storagePath = `${classId}/${randomUUID()}-${safe}`
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath)
      if (error) return res.status(500).json({ error: 'STORAGE_ERROR' })
      return res.status(200).json({ token: data.token, storagePath: data.path })
    }

    if (action === 'confirm') {
      const { classId, fileName, size, storagePath } = req.body || {}
      if (!classId || !fileName || !storagePath) return res.status(400).json({ error: 'INVALID_INPUT' })
      // 경로 위조 방지: 반드시 해당 강의 폴더 하위여야 함
      if (!String(storagePath).startsWith(`${classId}/`)) {
        return res.status(400).json({ error: 'BAD_PATH' })
      }
      const { data, error } = await supabase
        .from('cr_materials')
        .insert({
          class_id: classId,
          file_name: String(fileName).slice(0, 200),
          storage_path: storagePath,
          size: Number(size) || null,
        })
        .select('id, file_name, size, created_at')
        .single()
      if (error) return res.status(500).json({ error: 'DB_ERROR' })
      return res.status(201).json({ material: data })
    }

    return res.status(400).json({ error: 'UNKNOWN_ACTION' })
  }

  // ── 삭제 ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'MISSING_ID' })
    const { data: mat } = await supabase
      .from('cr_materials')
      .select('id, storage_path')
      .eq('id', id)
      .single()
    if (!mat) return res.status(404).json({ error: 'NOT_FOUND' })
    await supabase.storage.from(BUCKET).remove([mat.storage_path])
    const { error } = await supabase.from('cr_materials').delete().eq('id', id)
    if (error) return res.status(500).json({ error: 'DB_ERROR' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
}
