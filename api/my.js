import { getAdminClient } from './_lib/supabaseAdmin.js'

// Design Ref: §7 — 결제 완료자 전용 자료 조회/다운로드(개인 토큰 게이트)
//   GET ?token=                 : 내 강의 + 자료 목록
//   GET ?token=&download=<matId>: 자료 60초 서명 다운로드 URL
// 토큰은 cr_registrations.access_token(UUID). payment_status='paid' 인 건만 허용.
const BUCKET = 'cr-materials'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })

  const { token, download } = req.query
  if (!token) return res.status(400).json({ error: 'MISSING_TOKEN' })

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).json({ error: 'SERVER_MISCONFIG' })
  }

  // 토큰 → 결제 완료 신청 확인
  const { data: reg } = await supabase
    .from('cr_registrations')
    .select('id, name, class_id, payment_status')
    .eq('access_token', token)
    .maybeSingle()
  if (!reg || reg.payment_status !== 'paid') {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }

  // ── 다운로드: 서명 URL 발급 ───────────────────────────
  if (download) {
    const { data: mat } = await supabase
      .from('cr_materials')
      .select('id, file_name, storage_path, class_id')
      .eq('id', download)
      .maybeSingle()
    if (!mat || mat.class_id !== reg.class_id) {
      return res.status(404).json({ error: 'NOT_FOUND' })
    }
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(mat.storage_path, 60, { download: mat.file_name })
    if (error) return res.status(500).json({ error: 'STORAGE_ERROR' })
    return res.status(200).json({ url: data.signedUrl })
  }

  // ── 목록: 강의 정보 + 자료 ────────────────────────────
  const [{ data: cls }, { data: materials }] = await Promise.all([
    supabase.from('cr_classes').select('title, starts_at, location').eq('id', reg.class_id).single(),
    supabase
      .from('cr_materials')
      .select('id, file_name, size, created_at')
      .eq('class_id', reg.class_id)
      .order('created_at', { ascending: true }),
  ])

  return res.status(200).json({
    name: reg.name,
    class: cls || null,
    materials: materials || [],
  })
}
