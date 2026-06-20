// Design Ref: §5 — 관리자 클라이언트. 토큰은 localStorage 보관, 헤더로 전달.
const TOKEN_KEY = 'cr_admin_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
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
  login: (password) => req('/login', { method: 'POST', body: { password } }),
  listClasses: () => req('/classes'),
  createClass: (data) => req('/classes', { method: 'POST', body: data }),
  updateClass: (id, data) => req(`/classes/${id}`, { method: 'PATCH', body: data }),
  listRegistrations: (classId) => req(`/registrations?classId=${classId}`),
}
