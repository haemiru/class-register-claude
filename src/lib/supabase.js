import { createClient } from '@supabase/supabase-js'
// Design Ref: §3 — 공개 read 전용 anon 클라이언트. 쓰기는 서버리스 경유.

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // 키 미설정 시 빌드는 되지만 조회는 실패 — .env 안내
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 미설정')
}

export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key')
