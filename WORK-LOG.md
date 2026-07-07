# class-register 작업 로그

> **브레인센트 클래스**(뇌발달·호흡·후각 교육) 신청 페이지 — 관리자 클래스 설정 + 참여자 카드결제. PDCA로 진행.

## 1. 개요
- **Stack**: Vite + React + Tailwind + Supabase + Vercel Serverless / **PG**: 토스페이먼츠
- **아키텍처**: C. Pragmatic Balance (돈·정원 쓰기는 서버리스, 공개 조회는 Supabase 클라이언트)
- **PDCA 문서**: `docs/01-plan/`, `docs/02-design/`
- **GitHub**: https://github.com/haemiru/class-register-claude (독립 git repo, `main` 브랜치)
- **Vercel**: junominu's projects / 프로젝트명 `class-register-claude` (Vite preset, Root `./`)

## 2. 결정사항
- 관리자: ~~단일 비밀번호 → HMAC 토큰~~ → **Google OAuth(Supabase Auth) + `ADMIN_EMAILS` 허용목록** (2026-06-21 전환)
- 정원 마감: 마감 시 신청 차단. 정합성은 `classregi_register_paid`/`classregi_confirm_paid` 트랜잭션 RPC
- **Supabase: 메인 계정 공유 프로젝트(JunoMinu/jungaepro, ref `lxszaaxjgauyyjqgagjz`)**, 접두사 **`cr_` → `classregi_`** (2026-07-05 이전+변경). ~~다른 계정 `bjouyodzelcoghhxdfsv`~~는 폐기. 다른 앱(smart-home)과 프로젝트 공유 → 접두사로 격리
- 신청정보: **상세 문진**(이름·연락처·이메일 + 아기 정보 + 수면·호흡 문진 + 개인정보 동의). 문항 단일 소스 `src/lib/formSchema.js`, 저장은 `email` 컬럼 + `form_data jsonb`. 결제 후: 신청 내역 확인 화면 (이메일·알림톡 없음)
- **유료 결제 흐름: pending 선저장** — 민감 문진을 URL에 안 싣기 위해 결제 전 `pre-register`로 pending 행 저장 → 결제 승인 시 `classregi_confirm_paid`로 paid 승격
- 디자인: **밝은 톤**(세이지 `#7C9070`·스카이블루 `#A7C7E7`·코랄 `#E9A178`·아이보리 `#FBFAF6`, Pretendard). ~~바이브 코딩 다크 네온~~ 폐기 — 발달장애 아동 부모 대상
- 강의 자료: 비공개 버킷 + **개인 토큰 링크**(`/my?token=`) 접근, 강의당 다중 파일, 다운로드는 스트리밍 프록시(한글 파일명 보존)
- 무료 강의(fee=0): 토스 0원 결제 불가 → **결제 생략**(`register-free`)하고 바로 확정
- 정원 마감: status를 자동 변경하지 않고 **paid_count 기반 파생 표시**(목록에서 안 사라짐). 환불은 `payment_status='refunded'` → 자리 자동 복구

## 3. 구현 완료
### Do (2026-06-20)
- 설정: package.json, vite/tailwind/postcss, vercel.json, .env.example
- DB: `supabase/schema.sql` (테이블+RLS+RPC 3종)
- 프론트: ClassList, ClassDetail, Success, Fail, Admin(Login/Classes/Registrations), 공용 컴포넌트
- 서버리스: confirm-payment, admin/login, admin/classes(index/[id]), admin/registrations

### 2026-06-21 세션
- **GitHub 연결**: 독립 repo로 init → `haemiru/class-register-claude` 푸시 (`.bkit` gitignore)
- **Vercel 배포**: 환경변수 등록 후 배포 완료
- **관리자 인증 → Google OAuth 전환**
  - `api/_lib/auth.js`: Supabase access_token 검증 + `ADMIN_EMAILS` 허용목록 (`requireAdmin` async)
  - `api/admin/login.js` 제거, `api/admin/me.js` 추가
  - `adminApi.js`: localStorage 토큰 → Supabase 세션 기반 (signInWithGoogle/signOut/getSession/onAuthChange)
  - `AdminLogin`: Google 로그인 버튼 + 권한없음(403) 안내
- **연락처 입력 개선**: `formatPhone` — 숫자만 허용 + `010-1234-5678` 하이픈 자동 표시
- **사전 질문(note) 칸 추가**: 폼 textarea(선택) → toss successUrl → Success → confirm-payment → RPC → 관리자 목록 표시. `cr_registrations.note` 컬럼 + RPC `p_note` 추가
- **바이브 코딩 리디자인**: 다크 테마, 오로라 배경, 글래스 카드, 그라데이션 버튼, 히어로 섹션 (결제 폼만 신뢰감 위해 밝은 카드 유지)
- ✅ 매 변경마다 `npm run build` 통과

### 2026-06-22 세션
- **✅ Supabase 마이그레이션 실행 완료**: `cr_registrations.note` 컬럼 추가 + `cr_register_paid` 7-인자(`p_note`)로 재생성. SQL Editor에서 검증(컬럼·RPC 인자 확인) 후 적용. 이제 사전 질문 입력 → 저장 → 관리자 목록 표시 전 구간 연결됨
- **사전 질문 라벨 변경**: `강의에서 꼭 듣고 싶은 점` → `이번에 꼭 알고 싶은 한가지`
- **강의 자료 다운로드 기능 추가** (결제 완료자 전용):
  - 접근 방식: **개인 토큰 링크** — `cr_registrations.access_token`(UUID) 발급 → 완료 화면 "내 강의 자료 받기" 링크 → `/my?token=...` (북마크 가능, 강의 당일 재접속 OK)
  - 저장: Supabase **비공개 버킷 `cr-materials`**. 업로드/다운로드 모두 서버(service_role)·서명 URL 경유, anon 직접 접근 차단
  - 관리자 업로드: 서명 업로드 URL(`createSignedUploadUrl` → `uploadToSignedUrl` → confirm) 방식으로 서버리스 4.5MB 제한 회피. 강의당 **여러 파일** 추가/삭제
  - 다운로드: `/api/my` 가 토큰→paid 신청 검증 후 60초 서명 URL 발급(원본 파일명 download)
  - 신규: `cr_materials` 테이블, `api/admin/materials.js`, `api/my.js`, `src/pages/My.jsx`, AdminClasses 자료 관리 UI
  - ✅ `npm run build` 통과
- **강의 수정 기능 추가**: 관리자 강의 카드에 "수정" → 인라인 폼(제목·일시·장소·정원·참가비·설명)으로 편집·저장. PATCH 엔드포인트는 기존 것 재사용(프론트만 추가, DB 변경 없음). `toDatetimeLocal` 헬퍼로 ISO→datetime-local 역변환
- **강의 등록 시 자료 첨부**: 새 강의 등록 폼에서 파일 선택(여러 개) → 제출 시 `강의 생성 → 생성된 ID로 자료 업로드` 순차 처리. 일부 업로드 실패해도 강의는 등록되고 카드에서 재추가 안내. (자료는 class_id 필요 → 생성 후 업로드)
- **자료 업로드 400 수정**: 스토리지 키에 한글/공백이 들어가 Storage가 거부 → 키를 `{classId}/{UUID}.{ext}` ASCII로 변경, 원본명은 DB file_name 보관(다운로드 시 그 이름)
- **무료 강의(fee=0) 신청 지원**: 토스는 0원 결제 불가 → `api/register-free.js` 추가(서버에서 fee===0 검증 후 결제 없이 cr_register_paid 로 확정). 폼은 무료면 "무료로 신청하기" → `/success?free=1&token=`. Success/ClassDetail 무료 표기(🎁 무료, 신청완료)
- **다운로드 한글 파일명 깨짐 수정**: 서명 URL 직접 다운로드 시 Content-Disposition 이 `%EC%9E%90...`처럼 %-인코딩 그대로 노출(Storage가 RFC5987 미사용) → `api/download.js` 스트리밍 프록시 추가. 서버가 파일을 받아 `filename*=UTF-8''<encoded>` 헤더로 다시 내려 원본 한글 파일명 보존. `/my`는 이 엔드포인트로 직접 이동. (스트리밍이라 큰 파일도 응답 제한 회피)
- **정원 마감 = 파생 표시(이미 동작)**: 정원이 차도 status는 'open' 유지 → 목록에서 안 사라지고 ClassCard/ClassDetail 이 `paidCount>=capacity` 로 "마감" 표시 + 신청 차단. status 자동 변경 안 함 → 별도 작업 불필요 확인
- **신청자 환불 기능**: 신청자 보기에 "환불" 버튼. `POST /api/admin/registrations {registrationId}` → 유료는 토스 결제 취소(cancelPayment), 무료는 건너뜀 → `payment_status='refunded'`(자유 텍스트, DB 변경 없음). 환불 시 paid 카운트 감소 → 마감(파생) 자동 해제로 재신청 가능. 환불자는 자료 접근(my/download의 paid 검사)도 자동 차단

### 2026-07-05~06 세션 — 브레인센트 전환 + 상세 신청서 + Supabase 이전
- **브랜드/문구 전환**: 바이브코딩 클래스 → **브레인센트 클래스**. UI "강의"→"클래스" 통일. index.html 타이틀·메타, README, package.json 갱신. 헤더 로고 `</>` → 잎(leaf) 마크 + 워드마크
- **밝은 톤 리디자인**: 다크 네온 → 세이지·스카이블루·코랄·아이보리 팔레트. `tailwind.config.js`(토큰 교체: brand/accent 제거→sage/sky/coral/paper), `src/index.css`(라이트 테마, 흰 카드), 전 페이지/컴포넌트 라이트 클래스로 일괄 치환. 히어로 "숨쉬고 느끼며 자라는 브레인센트 클래스 / 뇌발달·호흡·후각…". 발달장애 아동 부모 대상 톤
- **상세 신청 문진 추가**(베이비 수면·호흡 클래스):
  - `src/lib/formSchema.js` 신설 — 문항 정의 단일 소스(신청 폼 + 관리자 조회 공유). 아기정보(이름/성별/생년월일/개월수/출생) + 문진(고민 복수·수면상태·밤중깸·입벌림·수유문제 복수·건강참고·기대) + 유입경로·상담주제 + 개인정보 동의(필수)
  - `RegistrationForm.jsx` 전면 재작성: 이메일 + 섹션별 필드(라디오/체크박스 Pill, textarea) + 동의 게이트(미동의 시 제출 불가). 필수: 성함·연락처·이메일·아기 생년월일·동의
  - **DB**: `classregi_registrations`에 `email`·`form_data jsonb` 컬럼. RPC `classregi_register_paid` 확장(p_email/p_form_data), 신규 `classregi_confirm_paid`(pending→paid 승격)
  - **유료 결제 흐름 변경**: 신규 `api/pre-register.js`가 결제 전 pending 행 저장 → `confirm-payment`는 `{paymentKey,orderId,amount}`만 받아 `classregi_confirm_paid`로 승격. `toss.js` successUrl에서 개인정보 제거, `Success.jsx` body 축소. 무료는 확장된 register-free 사용. (민감 문진을 URL에 안 실음 = 개인정보 보호)
  - **관리자 조회**: `AdminRegistrations` 표에 이메일 + 행별 "문진 보기" 펼침(form_data를 라벨/칩으로). API select에 email·form_data 추가
- **테이블 접두사 `cr_` → `classregi_`**: 공유 프로젝트 충돌 방지. 테이블 3 + RPC 4(open_classes/class_detail/register_paid/confirm_paid) + 인덱스/RLS 정책/버킷(`classregi-materials`) + 모든 api·src·README·schema.sql·migration 참조 일괄 변경. 주문ID 접두사(`cr_`)는 테이블명 무관하여 유지
- **Supabase 메인 계정 공유 프로젝트로 이전**: `bjouyodzelcoghhxdfsv`(다른 계정) → **`lxszaaxjgauyyjqgagjz`**(메인 JunoMinu/jungaepro). schema.sql 실행 완료(anon RPC 호출 200·`[]` 확인)
- **관리자 Google 로그인 정상화** ✅:
  - 증상 "사이트에 연결할 수 없음" 원인 = Vercel에 `VITE_SUPABASE_URL` 미설정 → 클라이언트가 `http://localhost` 폴백으로 튕김
  - 해결: Vercel 환경변수 6개 채우고 **Redeploy**, Google Cloud OAuth 클라이언트(`class-register web`)에 새 콜백 `https://lxszaaxjgauyyjqgagjz.supabase.co/auth/v1/callback` 추가, Supabase Redirect URLs에 `https://class-register-claude.vercel.app/**` 추가(Site URL은 공유 앱 smart-home 것이라 유지)
- ✅ 매 변경마다 `npm run build` 통과. 커밋 3건: `db9c7fe`(초기 rename 이전) 이후 리디자인/문진/접두사 순차 푸시(최신 `4991620`)

### 2026-07-07 세션 — 배포 E2E 검증 + 클래스 삭제 기능
- **배포 사이트 E2E 전 구간 통과**(브라우저 자동화): 관리자 Google 로그인 → 클래스 등록/수정(정원 변경) → 참가자 상세 신청 문진(formSchema 전 섹션) 렌더 → 연락처 하이픈 자동 포맷 → 개인정보 동의 게이트 → **무료 신청**(register-free) 완료화면 + access_token/자료 링크 → `form_data` 저장·관리자 문진 조회 → **정원 마감** 파생 표시 + "정원이 마감되어 신청할 수 없습니다" 차단 → **유료 결제** pre-register(pending 선저장) → **토스 결제창 진입**(상품명·금액 정확, 실제 승인은 생략=라이브 키). pending은 정원 미집계(paid만 카운트) 확인. 네트워크로 `register-free 200`/`PATCH 200`/`POST 201` 확증
- **클래스 삭제 기능 신규 추가**(커밋 `e899679`):
  - `api/admin/classes/[id].js` DELETE 핸들러: `registrations`·`materials` 행은 `on delete cascade`로 함께 삭제, **스토리지 파일은 cascade 안 되므로 먼저 수동 remove**. **결제 완료(paid) 신청자 있으면 409(`HAS_PAID`) 거부 → `?force=true` 시에만 삭제**(실수 방지)
  - `adminApi.js`: `deleteClass(id,{force})` + 에러 바디(`err.data`) 노출
  - `AdminClasses.jsx`: 카드에 "삭제" 버튼 + 2단계 확인(결제자 있으면 "N명 결제 완료, 그래도 삭제?" 재확인)
  - 배포 후 삭제 기능으로 테스트 클래스 2개 정리(무료=409→force 경로, 유료=pending 즉시). 실사용 검증 완료
- ✅ `npm run build` 통과

### 2026-07-07 세션 (이어서) — 클래스별 문진 유형(form_type) 분기
- **클래스별 신청 문진 분기 구현**(커밋 `acb4dda`, 버그수정 `71abfa0`):
  - `formSchema.js`: 단일 `FORM_SECTIONS` → **템플릿 맵 `FORM_TEMPLATES`**(`baby`=현행 수면·호흡 문진 / `basic`=간단 문진: 문의·요청+유입경로). `getTemplate/templateFields/emptyFormData(type)`, `FIELD_BY_KEY`, `FORM_TYPE_OPTIONS`. `PRIVACY_NOTICE.items` → 템플릿별 `privacyItems`
  - `RegistrationForm`: 클래스 `form_type` 템플릿으로 문진 렌더 + required 검사 템플릿 기반, 개인정보 수집항목도 템플릿별
  - `AdminRegistrations`: 클래스 `form_type` 기준 문진 답변 라벨 매핑
  - `AdminClasses`: 등록·수정 폼에 "신청 문진 유형" select 추가
  - API: POST 는 `form_type` 저장(기본 `baby`), PATCH EDITABLE 에 추가
  - **DB**: `classregi_classes.form_type` 컬럼 + 공개 RPC(`open_classes`/`class_detail`) 반환에 `form_type` 추가. `supabase/migration-form-type.sql` 신설·운영 DB 실행 완료
  - **버그 발견·수정**(`71abfa0`): `api/admin/registrations.js` GET 의 클래스 select 에 `form_type` 누락 → 관리자 문진 조회가 baby 템플릿으로 폴백돼 basic 전용 문항 미표시. select 에 `form_type` 추가로 해결
  - **E2E 검증 완료**: `basic` 클래스 등록 → 참가자 폼이 간단 문진(추가 정보만)으로 렌더 + 개인정보 수집항목 축소 확인 → 무료 신청 → 관리자 문진 조회에서 문의·요청/유입경로 정상 표시. 기존 클래스는 `form_type='baby'` 기본값으로 하위호환
  - 테스트 클래스 정리 완료
- ✅ 매 변경마다 `npm run build` 통과

### 2026-07-07 세션 (이어서) — 참가자 회원가입/계정 (✅ 배포 완료)
> ✅ **배포 완료**(커밋 `49db5e8`). 코드·`npm run build`·SQL 마이그레이션·카카오/확인메일 설정 모두 끝. 아래 세션 로그에 배포·후속 개선 정리됨.

- **결정사항**: 참가자 인증 = **이메일+비밀번호 & 카카오 로그인**(매직링크·Google은 부모 진입장벽/인앱브라우저 이슈로 제외). **로그인 신청 필수**. 이메일 **확인메일 끔**(즉시 가입). 관리자(Google)와 같은 Supabase Auth 세션 공유(관리자는 `ADMIN_EMAILS`로만 구분 → 충돌 없음). 자료는 기존 `access_token`/`/my` 재사용
- **구현 완료(로컬 작업트리 — 아직 커밋·푸시 안 함. 설정 후 배포 예정)**:
  - `src/lib/authApi.js`: 가입(`signUpEmail`)·로그인(`signInEmail`)·카카오(`signInKakao`)·세션·`getAccessToken`·`myRegistrations`(RPC)
  - `src/pages/Login.jsx`: 이메일+비번(로그인/가입 토글) + 카카오 버튼. `?next=` 복귀. 확인메일 켜짐 감지 시 안내
  - `src/pages/Account.jsx`: `/account` 내 신청 목록(로그인 전용) → 각 신청 "자료 받기"는 `/my?token=` 재사용
  - `src/App.jsx`: 라우트 `/login`·`/account` 추가, 헤더 인증상태(로그인/내 신청)
  - `RegistrationForm.jsx`: **로그인 게이트**(미로그인 시 "로그인하고 신청" → `/login?next=/class/:id`), 계정 이메일 프리필, 신청 fetch에 `Authorization: Bearer` 실어 보냄
  - 서버 `pre-register`/`register-free`: `getAuthUser(req)`로 로그인 필수(`401 LOGIN_REQUIRED`) + `user_id` 저장. `api/_lib/auth.js`에 `getAuthUser` export 추가
  - **DB**(schema.sql + `supabase/migration-accounts.sql`, **실행 완료**): `classregi_registrations.user_id` 컬럼 + 인덱스, `classregi_register_paid`에 `p_user_id`(10인자), `classregi_my_registrations()` RPC(auth.uid 기준)
- **배포 순서(중요)**: 마이그레이션(완료) → **확인메일 끄기 + 카카오 설정** → 커밋/푸시(Vercel 배포) → E2E(이메일 가입→로그인→신청→`/account` 확인)

### 2026-07-07 세션 (이어서) — 회원가입 배포 + 카카오 설정 + 폼 개선 + 관리자 추가
- **카카오/인증 설정 완료**(사용자가 콘솔에서 직접): Kakao Developers 앱 REST API 키(`b1adba7...`)·Client Secret → Supabase Kakao provider 활성화. Kakao 리다이렉트 URI `https://lxszaaxjgauyyjqgagjz.supabase.co/auth/v1/callback` 등록·저장. Supabase Redirect URLs에 `https://class-register-claude.vercel.app/**` 확인. **Confirm email OFF**(즉시 가입). Site URL은 smart-home 것 유지. **Vercel엔 카카오 관련 추가 env 불필요**(OAuth는 Supabase가 처리, 앱은 `signInWithOAuth({provider:'kakao'})`만 호출)
- **회원가입/계정 배포**(커밋 `49db5e8`, push): §3 회원가입 블록의 코드(authApi/Login/Account/App/RegistrationForm 로그인게이트/pre-register·register-free 로그인필수+user_id)를 커밋·푸시 → Vercel 자동 배포. `npm run build` 통과
- **신청 폼 UI 개선**(커밋 `56714e1`, `RegistrationForm.jsx`):
  - **선택 칩(Pill) 대비 강화**: 선택 상태를 연한 배경(`bg-sage/10`) → **진한 세이지 채움+흰 글씨+그림자**로. 성별/출생정보 등 라디오·체크박스 선택 여부가 명확해짐(공용 `Pill` 컴포넌트라 전 문진에 적용)
  - **생년월일 미래 차단**: date 입력에 `max=오늘`(로컬 기준 `todayLocal()`) + 제출 검증에도 미래 날짜면 거부. baby 템플릿 `babyBirth` 등 모든 date 타입에 적용
  - **이름칸 한글 입력 기본**: 보호자 성함·아기 이름(text) 입력에 `lang="ko"`(모바일 IME 한글 우선). 이메일·연락처는 별도 입력이라 미영향
- **관리자 계정 추가**: `gggcp1234@gmail.com`을 `ADMIN_EMAILS`에 추가(기존 `junominu@gmail.com`과 함께). Vercel **Production+Preview** env 갱신(`vercel env rm/add`) + 로컬 `.env` 갱신 → **프로덕션 재배포**(`vercel --prod`, env 변경은 재배포해야 반영됨). 새 관리자는 그 구글 계정으로 **구글 로그인**하면 접속(비교는 소문자 기준). 입력값 `gamil.com`은 `gmail.com` 오타로 확인·정정
- **Vercel CLI 연결됨**: 이 폴더가 `junominus-projects/class-register-claude`에 link됨(`.vercel/` 생성, gitignore). 이후 env 수정은 CLI로 가능: `npx vercel env ls` / `rm ADMIN_EMAILS production --yes` / `printf '%s' '<값>' | npx vercel env add ADMIN_EMAILS production` → `npx vercel --prod --yes`
- **앱 아이콘 제작**(카카오 앱 아이콘용, 128px): 브랜드 팔레트+잎+호흡물결 3안 생성. **A안 채택**(세이지 배경+아이보리 잎+상단 호흡물결) → `~/Downloads/brainscent-icon-A-128.png`. 원본 SVG(icon-A/B/C.svg)는 세션 스크래치패드(임시). 필요 시 SVG로 재렌더 가능
- ✅ E2E는 사용자가 직접 검증 예정(무료 클래스 생성해서 가입→로그인→무료 신청→`/account`→자료 받기). 참가비 0 클래스는 결제 생략 경로라 라이브 키에도 돈 안 나감 → 실사용 무료 클래스 겸 테스트 수단

## 4. 마이그레이션 상태 (운영 DB `lxszaaxjgauyyjqgagjz`, 공유 프로젝트)
- ✅ **`supabase/schema.sql` 전체 1회 실행 완료** → `classregi_*` 테이블 3 + RPC 4 + 인덱스/RLS + 버킷 `classregi-materials` 생성. anon RPC 200 확인
- 포함 내용: `email`·`form_data jsonb` 컬럼, `classregi_register_paid`(9인자), `classregi_confirm_paid`, `access_token`, 개인 토큰 자료 흐름 등 최신 전부
- `supabase/migration-form-fields.sql`은 **기존 `cr_` DB 업그레이드용**(이번 신규 실행엔 불필요, 참고용 보관)
- ✅ **`supabase/migration-form-type.sql` 실행 완료**(2026-07-07): `form_type` 컬럼 + 공개 RPC 2개 재정의
- ✅ **`supabase/migration-accounts.sql` 실행 완료**(2026-07-07): `user_id` 컬럼·인덱스 + `register_paid` 10인자 + `classregi_my_registrations` RPC
- **schema.sql 이 유일한 최신 소스.** 새/다른 프로젝트는 schema.sql 1회 실행이면 됨(위 마이그레이션 내용 모두 포함)

## 5. 다음 할 일 (돌아오면 **★여기부터★**)

### ★ 현재 상태: 계획 기능 전부 배포 완료 → **개선사항 대기 모드**
회원가입/계정까지 배포돼 **핵심 기능은 완성**. 다음 세션은 대개 **사용자가 말하는 개선사항을 §3 세션 로그 참고해 수정 → 커밋/푸시 or `vercel --prod`** 흐름. 최신 배포 상태·파일 위치는 §3(특히 2026-07-07 마지막 세션)과 아래 참고.

- **사용자 E2E는 직접 진행 중**: 무료 클래스 만들어 가입→로그인→무료 신청→`/account`→자료 받기 확인. 문제 나오면 그 지점부터 수정
- **개선 작업 시 주소록**:
  - 신청 폼/문진: `src/components/RegistrationForm.jsx` + 문항 정의 `src/lib/formSchema.js`(템플릿 `baby`/`basic`)
  - 관리자 클래스 관리: `src/pages/admin/AdminClasses.jsx`(등록/수정 폼, 참가비 0=무료), 신청자 조회 `AdminRegistrations.jsx`
  - 인증/계정: `src/lib/authApi.js`, `src/pages/Login.jsx`·`Account.jsx`, 서버 가드 `api/_lib/auth.js`(`getAuthUser`/`requireAdmin`/`ADMIN_EMAILS`)
  - 배포: 커밋/푸시하면 Vercel 자동 배포. env만 바꾸면 재배포 필요 → `npx vercel --prod --yes`
- **남은 운영 예외(코드 아님)**: 유료 결제 승인은 라이브 키라 결제창 진입까지만(무료로 검증), 환불은 `window.confirm`이라 수동

### 이미 완료 (참고)
- ✅ **회원가입/계정**(이메일+카카오, 로그인 신청 필수) 배포. 카카오/확인메일 설정 완료
- ✅ **신청 폼 개선**: 선택칩 대비 강화·생년월일 미래 차단·이름칸 한글(`lang="ko"`)
- ✅ **관리자 2인**: `junominu@gmail.com`, `gggcp1234@gmail.com` (ADMIN_EMAILS, 구글 로그인)
- ✅ **E2E 테스트**(2026-07-07). 유료는 결제창 진입까지, 환불은 자동화 미검증(수동)
- ✅ **클래스별 문진 유형(form_type) 분기**. `baby`/`basic`, 새 유형은 `formSchema.js FORM_TEMPLATES` 추가
- ✅ **클래스 삭제 기능**(paid 보호 409→force, 스토리지 정리)
- ✅ **앱 아이콘**(카카오용) A안 = `~/Downloads/brainscent-icon-A-128.png`

### 저우선/관찰
- (선택) 백엔드/SQL 주석의 "강의" 표현 정리(사용자 비노출이라 미변경)
- (관찰) 환불(`AdminRegistrations.jsx:51`)·클래스 삭제(`AdminClasses.jsx`)가 `window.confirm` 사용 → 자동화 테스트 시 다이얼로그 블록. 필요 시 커스텀 모달 교체

## 6. 주의
- ⚠️ **토스 키가 현재 라이브(`live_gck_`/`live_gsk_`)** — 유료 신청 시 실제 결제됨. 테스트 시 test 키로 교체하거나 무료 클래스 사용
- ⚠️ **Supabase 프로젝트는 다른 앱(smart-home)과 공유** — SQL 실행 시 `create ... if not exists`/`or replace`라 안전하나, 다른 테이블 건드리지 말 것. 접두사 `classregi_` 유지. Supabase **Site URL은 smart-home 것**이라 바꾸지 말고 Redirect URLs에 **추가만**
- **`VITE_` 값은 빌드 타임에 번들에 박힘** → 값 바꾸면 Vercel **Redeploy** 필수 (이번 로그인 장애의 원인이었음)
- 서버 키(service_role, TOSS_SECRET_KEY)는 `VITE_` 접두사 금지 (클라이언트 노출됨). `.env`는 `.gitignore`에 있어 미커밋
- 관리자 권한은 `ADMIN_EMAILS`(쉼표 구분)로만 결정. 현재 관리자 = `junominu@gmail.com`
- 구글 로그인: Supabase Auth Google provider **활성화 토글 ON + Save** 필수 (안 켜면 "provider is not enabled")
- 두 URL 구분: 구글 "승인된 리디렉션 URI" = Supabase 콜백(`...supabase.co/auth/v1/callback`) / Supabase "Redirect URLs" = 앱 주소(`class-register-claude.vercel.app/**`)
- 이 repo는 독립 git repo (Claude-prj 모노레포와 별개)

## 7. 환경변수 (Vercel + 로컬 `.env`, 총 6개) — ✅ 2026-07-06 설정 완료
| 변수 | 구분 | 값 |
|---|---|---|
| `VITE_SUPABASE_URL` | 클라이언트 | `https://lxszaaxjgauyyjqgagjz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 클라이언트 | Publishable key (`sb_publishable_...`) |
| `VITE_TOSS_CLIENT_KEY` | 클라이언트 | 토스 client key (**현재 라이브 `live_gck_`**) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 | service_role 키 (레거시 JWT `eyJ...` 사용 중) |
| `TOSS_SECRET_KEY` | 서버 | 토스 secret key (**현재 라이브 `live_gsk_`**) |
| `ADMIN_EMAILS` | 서버 | `junominu@gmail.com,gggcp1234@gmail.com` (Production+Preview) |

- 로컬 `.env`도 동일하게 채워둠(`.gitignore`됨). 로컬에서 `/api/*`까지 테스트하려면 `npm run dev`(프론트만) 대신 **`npx vercel dev`**
- Supabase 접속 정보는 코드에 하드코딩 없음(전부 env). 프로젝트 교체 = env만 바꾸고 재배포
