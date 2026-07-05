import { Routes, Route, Link } from 'react-router-dom'
// Design Ref: §6 — Frontend Routes
import ClassList from './pages/ClassList.jsx'
import ClassDetail from './pages/ClassDetail.jsx'
import Success from './pages/Success.jsx'
import Fail from './pages/Fail.jsx'
import My from './pages/My.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminClasses from './pages/admin/AdminClasses.jsx'
import AdminRegistrations from './pages/admin/AdminRegistrations.jsx'

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-paper/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2.5 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-sage to-sky text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6" />
            </svg>
          </span>
          <span className="text-base text-slate-800">
            브레인센트 <span className="font-normal text-slate-500">클래스</span>
          </span>
        </Link>
        <Link to="/admin" className="text-sm text-slate-500 transition hover:text-sage">
          관리자
        </Link>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-grid">
      {/* 오로라 배경 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-[10%] left-1/4 h-72 w-72 animate-float rounded-full bg-sage/15 blur-[120px]" />
        <div className="absolute top-1/3 right-1/5 h-72 w-72 animate-float rounded-full bg-sky/25 blur-[120px] [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-float rounded-full bg-coral/15 blur-[120px] [animation-delay:4s]" />
      </div>

      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Routes>
          <Route path="/" element={<ClassList />} />
          <Route path="/class/:id" element={<ClassDetail />} />
          <Route path="/success" element={<Success />} />
          <Route path="/fail" element={<Fail />} />
          <Route path="/my" element={<My />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/classes" element={<AdminClasses />} />
          <Route path="/admin/classes/:id" element={<AdminRegistrations />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-4xl px-4 pb-10 pt-6 text-center text-xs text-slate-400">
        © 브레인센트 클래스 · 안전한 결제는 토스페이먼츠
      </footer>
    </div>
  )
}
