import { Readable } from 'node:stream'
import { getAdminClient } from './_lib/supabaseAdmin.js'

// Design Ref: §7 — 결제 완료자 전용 자료 다운로드(스트리밍 프록시)
// 서명 URL 직접 다운로드는 한글 파일명이 Content-Disposition 에서 깨짐(서버가 %-인코딩 그대로 넣음).
// → 서버에서 받아 RFC 5987(filename*=UTF-8'') 헤더로 다시 내려 원본 한글 파일명 보존.
const BUCKET = 'cr-materials'
export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('METHOD_NOT_ALLOWED')

  const { token, id } = req.query
  if (!token || !id) return res.status(400).send('잘못된 요청입니다.')

  let supabase
  try {
    supabase = getAdminClient()
  } catch {
    return res.status(500).send('서버 설정 오류')
  }

  // 토큰 → 결제 완료 신청 확인
  const { data: reg } = await supabase
    .from('cr_registrations')
    .select('class_id, payment_status')
    .eq('access_token', token)
    .maybeSingle()
  if (!reg || reg.payment_status !== 'paid') return res.status(403).send('접근 권한이 없습니다.')

  // 자료 확인 + 해당 강의 소속 검증
  const { data: mat } = await supabase
    .from('cr_materials')
    .select('file_name, storage_path, class_id')
    .eq('id', id)
    .maybeSingle()
  if (!mat || mat.class_id !== reg.class_id) return res.status(404).send('자료를 찾을 수 없습니다.')

  // 서명 URL 발급 후 서버에서 받아 스트리밍
  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(mat.storage_path, 60)
  if (error || !signed?.signedUrl) return res.status(500).send('다운로드 링크 생성 실패')

  const upstream = await fetch(signed.signedUrl)
  if (!upstream.ok || !upstream.body) return res.status(502).send('파일을 가져오지 못했습니다.')

  // RFC 5987: 한글 등 비ASCII 파일명 보존 (브라우저는 filename* 를 우선 사용)
  const encoded = encodeURIComponent(mat.file_name)
  const ascii = mat.file_name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_')
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
  const len = upstream.headers.get('content-length')
  if (len) res.setHeader('Content-Length', len)
  res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`)

  Readable.fromWeb(upstream.body).pipe(res)
}
