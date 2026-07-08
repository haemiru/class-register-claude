import { inputCls } from './Field.jsx'
import {
  FIELD_TYPES,
  OPTION_TYPES,
  blankField,
  templateToSchema,
  FORM_TYPE_OPTIONS,
} from '../lib/formSchema.js'

// 구글 폼 스타일 폼 빌더 — 관리자가 클래스별 신청 문진 항목을 직접 구성한다.
// value: 필드 평면 배열([{key,label,type,required,options?,placeholder?,hint?}]) / onChange(fields)
export default function FormBuilder({ value, onChange }) {
  const fields = Array.isArray(value) ? value : []

  const replace = (idx, patch) => onChange(fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  const remove = (idx) => onChange(fields.filter((_, i) => i !== idx))
  const add = () => onChange([...fields, blankField(fields)])
  const move = (idx, dir) => {
    const j = idx + dir
    if (j < 0 || j >= fields.length) return
    const next = fields.slice()
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }

  function changeType(idx, type) {
    const patch = { type }
    // 보기 유형으로 바꾸면 최소 1개 빈 항목을 보장
    if (OPTION_TYPES.has(type) && !(fields[idx].options?.length > 0)) patch.options = ['']
    replace(idx, patch)
  }

  function fillPreset(type) {
    if (fields.length > 0 && !confirm('현재 질문을 모두 지우고 템플릿 항목으로 바꿀까요?')) return
    onChange(type ? templateToSchema(type) : [])
  }

  return (
    <div className="space-y-3">
      {/* 빠른 시작 프리셋 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">빠른 시작:</span>
        <PresetBtn onClick={() => fillPreset(null)}>빈 폼</PresetBtn>
        {FORM_TYPE_OPTIONS.map((o) => (
          <PresetBtn key={o.value} onClick={() => fillPreset(o.value)}>
            {o.label} 템플릿
          </PresetBtn>
        ))}
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
          아직 질문이 없습니다. 아래 <span className="font-semibold">질문 추가</span>로 시작하거나
          템플릿을 불러오세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((f, idx) => (
            <li key={f.key} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">질문 {idx + 1}</span>
                <div className="flex items-center gap-1 text-xs">
                  <IconBtn onClick={() => move(idx, -1)} disabled={idx === 0} title="위로">
                    ↑
                  </IconBtn>
                  <IconBtn onClick={() => move(idx, 1)} disabled={idx === fields.length - 1} title="아래로">
                    ↓
                  </IconBtn>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="ml-1 rounded px-2 py-1 text-rose-600 hover:bg-rose-50"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <input
                className={inputCls}
                value={f.label}
                onChange={(e) => replace(idx, { label: e.target.value })}
                placeholder="질문 내용 (예: 아기 성별)"
              />

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <select
                  className={`${inputCls} w-auto`}
                  value={f.type}
                  onChange={(e) => changeType(idx, e.target.value)}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => replace(idx, { required: e.target.checked })}
                    className="h-4 w-4 accent-sage"
                  />
                  필수
                </label>
              </div>

              {OPTION_TYPES.has(f.type) && (
                <OptionsEditor options={f.options || []} onChange={(options) => replace(idx, { options })} />
              )}

              <input
                className={`${inputCls} mt-2`}
                value={f.hint || ''}
                onChange={(e) => replace(idx, { hint: e.target.value })}
                placeholder="도움말 (선택, 질문 아래 작게 표시)"
              />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-dashed border-sage/60 py-2 text-sm font-medium text-sage-dark hover:bg-sage/5"
      >
        + 질문 추가
      </button>
    </div>
  )
}

// 보기 항목(radio/checkbox/select) 편집기
function OptionsEditor({ options, onChange }) {
  const set = (i, v) => onChange(options.map((o, j) => (j === i ? v : o)))
  const remove = (i) => onChange(options.filter((_, j) => j !== i))
  const add = () => onChange([...options, ''])

  return (
    <div className="mt-2 space-y-1.5 rounded-md bg-slate-50 p-2">
      <span className="text-xs font-medium text-slate-500">보기 항목</span>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-slate-400">·</span>
          <input
            className={`${inputCls} py-1.5`}
            value={opt}
            onChange={(e) => set(i, e.target.value)}
            placeholder={`보기 ${i + 1}`}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
          >
            제거
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs text-sage-dark underline">
        + 보기 추가
      </button>
    </div>
  )
}

function PresetBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-600 hover:border-sage/50 hover:text-sage-dark"
    >
      {children}
    </button>
  )
}

function IconBtn({ onClick, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
    >
      {children}
    </button>
  )
}
