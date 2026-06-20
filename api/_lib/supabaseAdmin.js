import { createClient } from '@supabase/supabase-js'
// Design Ref: §3, §9 — 서버 전용 service_role 클라이언트(RLS 우회). 절대 클라이언트로 노출 금지.

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function getAdminClient() {
  if (!url || !serviceKey) {
    throw new Error('SERVER_MISCONFIG: SUPABASE URL / SERVICE_ROLE_KEY 미설정')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
