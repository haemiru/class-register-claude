import { Routes, Route, Link } from 'react-router-dom'
// Design Ref: §6 — Frontend Routes
import ClassList from './pages/ClassList.jsx'
import ClassDetail from './pages/ClassDetail.jsx'
import Success from './pages/Success.jsx'
import Fail from './pages/Fail.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminClasses from './pages/admin/AdminClasses.jsx'
import AdminRegistrations from './pages/admin/AdminRegistrations.jsx'

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="font-mono text-lg text-gradient">&lt;/&gt;</span>
          <span className="text-base text-white">
            바이브코딩 <span className="font-normal text-slate-400">클래스</span>
          </span>
        </Link>
        <Link to="/admin" className="text-sm text-slate-400 transition hover:text-white">
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
        <div className="absolute -top-[10%] left-1/4 h-72 w-72 animate-float rounded-full bg-violet-600/30 blur-[120px]" />
        <div className="absolute top-1/3 right-1/5 h-72 w-72 animate-float rounded-full bg-cyan-500/20 blur-[120px] [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-float rounded-full bg-fuchsia-600/20 blur-[120px] [animation-delay:4s]" />
      </div>

      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Routes>
          <Route path="/" element={<ClassList />} />
          <Route path="/class/:id" element={<ClassDetail />} />
          <Route path="/success" element={<Success />} />
          <Route path="/fail" element={<Fail />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/classes" element={<AdminClasses />} />
          <Route path="/admin/classes/:id" element={<AdminRegistrations />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-4xl px-4 pb-10 pt-6 text-center text-xs text-slate-500">
        <span className="font-mono">© 바이브코딩 클래스</span> · 안전한 결제는 토스페이먼츠
      </footer>
    </div>
  )
}
