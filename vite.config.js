import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Design Ref: §3 — Vite SPA. dev 중 /api 호출은 `vercel dev` 또는 배포 환경에서 동작.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
