// Design Ref: §5 — 관리자 클라이언트. 인증은 Supabase(Google OAuth) 세션을 사용.
import { supabase } from './supabase.js'

// 현재 Supabase 세션 (없으면 null)
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data?.session || null
}

// 인증 상태 변화 구독 (OAuth 리다이렉트 후 세션 감지용)
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

// Google 로그인 시작 → 로그인 후 /admin 으로 복귀
export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/admin` },
  })
}

export async function signOut() {
  await supabase.auth.signOut()
}

async function req(path, { method = 'GET', body } = {}) {
  const session = await getSession()
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(json.error || '요청 실패')
    err.status = res.status
    throw err
  }
  return json
}

export const adminApi = {
  me: () => req('/me'),
  listClasses: () => req('/classes'),
  createClass: (data) => req('/classes', { method: 'POST', body: data }),
  updateClass: (id, data) => req(`/classes/${id}`, { method: 'PATCH', body: data }),
  listRegistrations: (classId) => req(`/registrations?classId=${classId}`),
  refundRegistration: (registrationId) => req('/registrations', { method: 'POST', body: { registrationId } }),
  // 강의 자료
  listMaterials: (classId) => req(`/materials?classId=${classId}`),
  signMaterialUpload: (classId, fileName) =>
    req('/materials', { method: 'POST', body: { action: 'sign', classId, fileName } }),
  confirmMaterial: (data) => req('/materials', { method: 'POST', body: { action: 'confirm', ...data } }),
  deleteMaterial: (id) => req(`/materials?id=${id}`, { method: 'DELETE' }),
}

const MATERIAL_BUCKET = 'classregi-materials'

// 자료 업로드: sign → Storage 직접 업로드(서명 URL) → confirm
export async function uploadMaterial(classId, file) {
  const { token, storagePath } = await adminApi.signMaterialUpload(classId, file.name)
  const { error } = await supabase.storage.from(MATERIAL_BUCKET).uploadToSignedUrl(storagePath, token, file)
  if (error) throw new Error('업로드 실패')
  return adminApi.confirmMaterial({ classId, fileName: file.name, size: file.size, storagePath })
}
