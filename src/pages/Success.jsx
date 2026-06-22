import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { won } from '../lib/format.js'

// Design Ref: §7 — 토스 successUrl 도착 → 서버 승인 검증(/api/confirm-payment)
// Plan SC-3: 승인된 건만 신청 확정(paid)
export default function Success() {
  const [params] = useSearchParams()
  const [state, setState] = useState('confirming') // confirming|done|error
  const [message, setMessage] = useState('')
  const [reg, setReg] = useState(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // StrictMode 이중 호출 방지(멱등이지만 UX)
    ran.current = true
    ;(async () => {
      // 무료 신청: 결제 승인 없이 토큰으로 신청 정보 조회
      if (params.get('free')) {
        const token = params.get('token')
        try {
          const res = await fetch(`/api/my?token=${encodeURIComponent(token)}`)
          const json = await res.json()
          if (!res.ok) {
            setState('error')
            setMessage('신청 정보를 확인하지 못했습니다.')
            return
          }
          setReg({ name: json.name, amount: 0, access_token: token })
          setState('done')
        } catch {
          setState('error')
          setMessage('서버와 통신하지 못했습니다.')
        }
        return
      }
      const body = {
        paymentKey: params.get('paymentKey'),
        orderId: params.get('orderId'),
        amount: Number(params.get('amount')),
        classId: params.get('classId'),
        name: params.get('name'),
        phone: params.get('phone'),
        note: params.get('note') || '',
      }
      try {
        const res = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok) {
          setState('error')
          setMessage(
            json.error === 'FULL'
              ? '아쉽게도 신청 직전에 정원이 마감되었습니다. 결제는 자동 취소 처리가 필요합니다(관리자 문의).'
              : json.error === 'AMOUNT_MISMATCH'
                ? '결제 금액이 일치하지 않습니다.'
                : '결제 승인에 실패했습니다.',
          )
          return
        }
        setReg(json.registration)
        setState('done')
      } catch {
        setState('error')
        setMessage('서버와 통신하지 못했습니다.')
      }
    })()
  }, [params])

  if (state === 'confirming')
    return (
      <p className="py-16 text-center font-mono text-sm text-slate-400">
        <span className="animate-pulse">결제를 확인하고 있습니다…</span>
      </p>
    )

  if (state === 'error')
    return (
      <div className="space-y-4 py-10 text-center">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold text-white">신청을 완료하지 못했습니다</h1>
        <p className="mx-auto max-w-sm text-sm text-slate-400">{message}</p>
        <Link to="/" className="inline-block text-sm text-violet-300 transition hover:text-cyan-300">
          강의 목록으로
        </Link>
      </div>
    )

  return (
    <div className="space-y-6 py-8 text-center">
      <div className="animate-float text-6xl">🎉</div>
      <h1 className="text-2xl font-extrabold text-white">
        신청이 <span className="text-gradient">완료</span>되었습니다
      </h1>
      <div className="glass mx-auto max-w-sm p-6 text-left text-sm">
        <dl className="space-y-3">
          <Row label="신청자" value={reg?.name} />
          {reg?.phone && <Row label="연락처" value={reg.phone} />}
          {Number(reg?.amount) > 0 ? (
            <>
              <Row label="결제금액" value={won(reg?.amount)} mono />
              <Row label="결제상태" value="결제완료 ✅" />
            </>
          ) : (
            <>
              <Row label="참가비" value="무료" />
              <Row label="신청상태" value="신청완료 ✅" />
            </>
          )}
        </dl>
      </div>
      {reg?.access_token && (
        <div className="space-y-2">
          <Link
            to={`/my?token=${reg.access_token}`}
            className="btn-gradient inline-block rounded-xl px-6 py-3 text-sm font-semibold"
          >
            📂 내 강의 자료 받기
          </Link>
          <p className="text-xs text-slate-500">이 링크를 저장해 두면 강의 당일에도 다시 받을 수 있습니다.</p>
        </div>
      )}
      <div>
        <Link to="/" className="inline-block text-sm text-violet-300 transition hover:text-cyan-300">
          강의 목록으로
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className={`font-medium text-white ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
