import { useState } from 'react'
import Field, { inputCls } from './Field.jsx'
import { requestCardPayment } from '../lib/toss.js'
import { won, formatPhone } from '../lib/format.js'

// Design Ref: §6, §7 — 신청서(이름·연락처) → 토스 결제위젯 호출
export default function RegistrationForm({ cls, disabled }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !phone.trim()) {
      setError('이름과 연락처를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      // Plan SC-2: 신청 → 결제 흐름 진입
      await requestCardPayment({ cls, name: name.trim(), phone: phone.trim(), note: note.trim() })
    } catch (err) {
      // 사용자가 결제창을 닫은 경우 등
      setError(err?.message || '결제를 시작하지 못했습니다.')
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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="이름" required>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
        />
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
      <Field label="이번에 꼭 알고 싶은 한가지" hint="미리 알려주시면 강의에 반영해 드려요. (선택)">
        <textarea
          className={inputCls}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: ○○가 가장 궁금해요"
          maxLength={500}
        />
      </Field>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="btn-gradient w-full rounded-xl py-3.5"
      >
        {submitting ? '결제창 여는 중…' : `${won(cls.fee)} 결제하고 신청`}
      </button>
    </form>
  )
}
