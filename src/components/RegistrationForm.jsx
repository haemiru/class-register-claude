import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Field, { inputCls } from './Field.jsx'
import { requestCardPayment } from '../lib/toss.js'
import { won, formatPhone } from '../lib/format.js'
import { resolveFields, emptyFormDataFromFields, PRIVACY_NOTICE, PRIVACY_ITEMS_TEXT } from '../lib/formSchema.js'
import { getSession, getAccessToken } from '../lib/authApi.js'

// Design Ref: §6, §7, §8 — 상세 신청서. 로그인 필수 → 유료: pre-register 후 결제 / 무료: 즉시 확정
// 문진 내용은 클래스의 form_schema(폼 빌더)로 렌더한다. 없으면 레거시 form_type 템플릿으로 폴백.
export default function RegistrationForm({ cls, disabled }) {
  const nav = useNavigate()
  const isFree = Number(cls.fee) === 0
  const fields = resolveFields(cls)
  const [authState, setAuthState] = useState('loading') // loading | in | out
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [data, setData] = useState(() => emptyFormDataFromFields(fields))
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 로그인 필수 — 세션 확인 + 계정 이메일 프리필
  useEffect(() => {
    ;(async () => {
      const session = await getSession()
      if (session?.user) {
        setAuthState('in')
        if (session.user.email) setEmail(session.user.email)
      } else {
        setAuthState('out')
      }
    })()
  }, [])

  const setField = (key, value) => setData((d) => ({ ...d, [key]: value }))
  const toggleCheck = (key, option) =>
    setData((d) => {
      const cur = d[key] || []
      return { ...d, [key]: cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option] }
    })

  function validate() {
    if (!name.trim() || !phone.trim() || !email.trim()) return '보호자 성함·연락처·이메일을 입력해 주세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '이메일 형식을 확인해 주세요.'
    // 문진 필드 검사 (required 누락 + 날짜 미래 방지)
    for (const f of fields) {
      const v = data[f.key]
      const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim()
      if (f.required && empty) return `${f.label}을(를) 입력해 주세요.`
      if (f.type === 'date' && !empty && String(v) > todayLocal()) {
        return `${f.label}은(는) 오늘 이후로 선택할 수 없습니다.`
      }
    }
    if (!consent) return '개인정보 수집·이용에 동의해 주셔야 신청할 수 있습니다.'
    return ''
  }

  async function onSubmit(e) {
    e.preventDefault()
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }
    setError('')
    setSubmitting(true)
    const form_data = { ...data, privacyConsent: true }
    const base = { classId: cls.id, name: name.trim(), phone: phone.trim(), email: email.trim(), form_data }
    // 로그인 필수 — 신청을 계정에 연결하기 위해 access_token 을 서버로 전달
    const token = await getAccessToken()
    if (!token) {
      setError('로그인이 필요합니다. 다시 로그인해 주세요.')
      setSubmitting(false)
      return
    }
    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    try {
      if (isFree) {
        // 무료: 결제 없이 바로 신청 확정
        const res = await fetch('/api/register-free', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(base),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error === 'FULL' ? '아쉽게도 정원이 마감되었습니다.' : '신청을 완료하지 못했습니다.')
          setSubmitting(false)
          return
        }
        nav(`/success?free=1&token=${json.registration.access_token}`)
        return
      }
      // 유료: 신청 내용을 먼저 저장(pending) → 결제창 진입
      const res = await fetch('/api/pre-register', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(base),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(
          json.error === 'FULL'
            ? '아쉽게도 정원이 마감되었습니다.'
            : json.error === 'CLOSED'
              ? '모집이 마감된 클래스입니다.'
              : '신청 준비에 실패했습니다.',
        )
        setSubmitting(false)
        return
      }
      await requestCardPayment({ cls, orderId: json.orderId, name: name.trim() })
    } catch (err) {
      setError(err?.message || (isFree ? '신청을 시작하지 못했습니다.' : '결제를 시작하지 못했습니다.'))
      setSubmitting(false)
    }
  }

  if (disabled) {
    return (
      <div className="rounded-lg bg-slate-100 p-4 text-center text-sm text-slate-500">
        정원이 마감되어 신청할 수 없습니다.
      </div>
    )
  }

  if (authState === 'loading') {
    return <p className="py-6 text-center text-sm text-slate-500">불러오는 중…</p>
  }

  // 로그인 필수 — 미로그인 시 로그인 유도(로그인 후 이 클래스로 복귀)
  if (authState === 'out') {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-600">
          클래스 신청은 <span className="font-semibold text-slate-800">로그인 후</span> 가능합니다.
          <br />
          신청 내역과 자료를 계정에서 편하게 확인할 수 있어요.
        </p>
        <Link
          to={`/login?next=${encodeURIComponent(`/class/${cls.id}`)}`}
          className="btn-gradient inline-block rounded-xl px-6 py-3 text-sm"
        >
          로그인하고 신청하기
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 보호자 정보 */}
      <SectionTitle>보호자 정보</SectionTitle>
      <div className="space-y-4">
        <Field label="보호자 성함" required>
          <input lang="ko" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
        </Field>
        <Field label="연락처" required hint="안내·환불 연락에 사용됩니다.">
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="010-1234-5678"
            inputMode="numeric"
            maxLength={13}
          />
        </Field>
        <Field label="이메일" required hint="자료 발송용">
          <input
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="parent@example.com"
          />
        </Field>
      </div>

      {/* 문진 항목 (클래스 form_schema) */}
      {fields.length > 0 && (
        <div className="space-y-4">
          <SectionTitle>신청 정보</SectionTitle>
          {fields.map((f) => (
            <FieldControl key={f.key} field={f} value={data[f.key]} setField={setField} toggleCheck={toggleCheck} />
          ))}
        </div>
      )}

      {/* 개인정보 동의 */}
      <div className="space-y-3">
        <SectionTitle>개인정보 수집·이용 동의</SectionTitle>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
          <p>· 수집 항목: {PRIVACY_ITEMS_TEXT}</p>
          <p>· 수집 목적: {PRIVACY_NOTICE.purpose}</p>
          <p>· 보관 기간: {PRIVACY_NOTICE.retention}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="h-4 w-4 accent-sage"
          />
          개인정보 수집·이용에 동의합니다. <span className="text-rose-500">*</span>
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-gradient w-full rounded-xl py-3.5">
        {submitting
          ? isFree
            ? '신청하는 중…'
            : '결제창 여는 중…'
          : isFree
            ? '무료로 신청하기'
            : `${won(cls.fee)} 결제하고 신청`}
      </button>
    </form>
  )
}

function SectionTitle({ children }) {
  return (
    <h3 className="flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-bold text-slate-700">
      <span className="h-4 w-1.5 rounded-full bg-sage" /> {children}
    </h3>
  )
}

// 필드 타입별 컨트롤 렌더링
function FieldControl({ field, value, setField, toggleCheck }) {
  const { key, label, type, options, placeholder, hint, required } = field

  if (type === 'radio') {
    return (
      <Field label={label} required={required} hint={hint}>
        <div className="flex flex-wrap gap-2">
          {(options || []).map((opt) => (
            <Pill key={opt} active={value === opt} onClick={() => setField(key, value === opt ? '' : opt)}>
              {opt}
            </Pill>
          ))}
        </div>
      </Field>
    )
  }

  if (type === 'checkbox') {
    const arr = value || []
    return (
      <Field label={label} required={required} hint={hint}>
        <div className="flex flex-wrap gap-2">
          {(options || []).map((opt) => (
            <Pill key={opt} active={arr.includes(opt)} onClick={() => toggleCheck(key, opt)}>
              {opt}
            </Pill>
          ))}
        </div>
      </Field>
    )
  }

  if (type === 'textarea') {
    return (
      <Field label={label} required={required} hint={hint}>
        <textarea
          className={inputCls}
          rows={3}
          value={value}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={placeholder}
          maxLength={1000}
        />
      </Field>
    )
  }

  if (type === 'select') {
    return (
      <Field label={label} required={required} hint={hint}>
        <select className={inputCls} value={value || ''} onChange={(e) => setField(key, e.target.value)}>
          <option value="">선택해 주세요</option>
          {(options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>
    )
  }

  // text | date | number
  return (
    <Field label={label} required={required} hint={hint}>
      <input
        type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
        lang={type === 'text' ? 'ko' : undefined}
        inputMode={type === 'number' ? 'numeric' : undefined}
        className={inputCls}
        value={value}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={placeholder}
        max={type === 'date' ? todayLocal() : undefined}
      />
    </Field>
  )
}

// 로컬 기준 오늘 날짜(YYYY-MM-DD). 생년월일 등에 미래 선택을 막는 데 사용.
function todayLocal() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// 선택 칩(라디오/체크 공용)
function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? 'border-sage bg-sage font-semibold text-white shadow-sm'
          : 'border-slate-300 bg-white text-slate-600 hover:border-sage/50'
      }`}
    >
      {children}
    </button>
  )
}
