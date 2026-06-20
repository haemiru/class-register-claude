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
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-brand">
          강의 신청
        </Link>
        <Link to="/admin" className="text-sm text-slate-500 hover:text-brand">
          관리자
        </Link>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6">
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
    </div>
  )
}
