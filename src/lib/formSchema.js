// 브레인센트 베이비 수면·호흡 클래스 신청 문진 정의.
// 신청 폼(RegistrationForm)과 관리자 상세 조회(AdminRegistrations)가 이 정의를 공유한다.
// 여기 담기는 값은 classregi_registrations.form_data(jsonb)에 그대로 저장된다.
// (보호자 성함·연락처·이메일은 별도 컬럼 name/phone/email 로 저장 → 여기 미포함)

export const CONCERN_OPTIONS = [
  '잠드는 데 오래 걸린다',
  '자다가 자주 깬다',
  '안아줘야 잠든다',
  '입을 벌리고 있는 시간이 많다',
  '입을 벌리고 잔다',
  '코가 자주 막힌다',
  '코를 곤다',
  '수유 중 숨 쉬려고 자주 멈춘다',
  '사래가 자주 걸린다',
  '수유 시간이 길다',
  '쉽게 놀란다',
  '예민하다',
  '터미타임을 힘들어한다',
  '머리 모양이 걱정된다',
  '얼굴형이 걱정된다',
  '특별한 고민 없음',
  '기타',
]

const FEEDING_OPTIONS = [
  '숨 쉬려고 자주 멈춤',
  '사래가 자주 걸림',
  '수유 중 피곤해함',
  '수유 시간이 김',
  '수유 중 짜증을 냄',
  '특별한 문제 없음',
]

const CONSULT_OPTIONS = [
  '수면',
  '코호흡',
  '입벌림',
  '수유',
  '사래',
  '얼굴발달',
  '사두증',
  '예민함',
  '터미타임',
  '기타',
]

// 각 섹션은 { title, fields[] }. field: { key, label, type, options?, placeholder?, hint?, required? }
// type: 'text' | 'date' | 'radio' | 'checkbox' | 'textarea'
export const FORM_SECTIONS = [
  {
    title: '아기 정보',
    fields: [
      { key: 'babyName', label: '아기 이름', type: 'text' },
      { key: 'babySex', label: '아기 성별', type: 'radio', options: ['남아', '여아'] },
      { key: 'babyBirth', label: '아기 생년월일', type: 'date', required: true },
      { key: 'babyMonths', label: '현재 개월 수', type: 'text', placeholder: '예) 5개월' },
      { key: 'birthType', label: '출생 정보', type: 'radio', options: ['만삭아', '이른둥이(조산아)'] },
    ],
  },
  {
    title: '수면·호흡 문진',
    fields: [
      {
        key: 'concerns',
        label: '현재 가장 고민되는 부분',
        type: 'checkbox',
        options: CONCERN_OPTIONS,
        hint: '복수 선택 가능',
      },
      {
        key: 'sleepOnset',
        label: '현재 수면 상태 (잠들기까지)',
        type: 'radio',
        options: ['잠드는 데 10분 이내', '10~30분', '30분~1시간', '1시간 이상'],
      },
      {
        key: 'nightWakes',
        label: '밤중에 깨는 횟수',
        type: 'radio',
        options: ['거의 없음', '1~2회', '3~4회', '5회 이상'],
      },
      {
        key: 'mouthOpen',
        label: '평소 입을 벌리고 있는 모습',
        type: 'radio',
        options: ['거의 없음', '가끔 있음', '자주 있음', '대부분 입을 벌리고 있음'],
      },
      {
        key: 'feedingIssues',
        label: '수유 중 이런 모습이 있나요?',
        type: 'checkbox',
        options: FEEDING_OPTIONS,
        hint: '복수 선택 가능',
      },
      {
        key: 'healthNotes',
        label: '건강·발달 관련 참고사항',
        type: 'textarea',
        placeholder: '예) 사경 치료 경험, 사두증, 이른둥이, NICU 입원, 알레르기, 비염 등',
      },
      {
        key: 'expectation',
        label: '이번 클래스에서 가장 기대하는 것',
        type: 'textarea',
      },
    ],
  },
  {
    title: '마지막으로',
    fields: [
      {
        key: 'referralSource',
        label: '브레인센트를 알게 된 경로',
        type: 'radio',
        options: ['인스타그램', '블로그', '카카오톡', '지인 소개', '기존 수강생 추천', '기타'],
      },
      {
        key: 'consultTopics',
        label: '가장 먼저 상담받고 싶은 주제',
        type: 'checkbox',
        options: CONSULT_OPTIONS,
        hint: '복수 선택 가능',
      },
    ],
  },
]

// 모든 필드를 평탄화 (관리자 조회에서 라벨 매핑용)
export const FORM_FIELDS = FORM_SECTIONS.flatMap((s) => s.fields)

// 초기 form_data 상태 (checkbox → 배열, 그 외 → '')
export function emptyFormData() {
  const out = {}
  for (const f of FORM_FIELDS) out[f.key] = f.type === 'checkbox' ? [] : ''
  return out
}

// 개인정보 수집·이용 동의 (필수). form_data.privacyConsent 로 저장.
export const PRIVACY_NOTICE = {
  items: '보호자 성함, 연락처, 이메일, 아기 기본 정보',
  purpose: '수강 신청 확인, 수업 안내, 자료 제공, 사후 관리',
  retention: '수업 종료 후 1년',
}
