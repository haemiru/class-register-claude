# class-register 작업 로그

> 강의신청 페이지 — 관리자 강의 설정 + 참여자 카드결제. PDCA로 진행.

## 1. 개요
- **Stack**: Vite + React + Tailwind + Supabase + Vercel Serverless / **PG**: 토스페이먼츠
- **아키텍처**: C. Pragmatic Balance (돈·정원 쓰기는 서버리스, 공개 조회는 Supabase 클라이언트)
- **PDCA 문서**: `docs/01-plan/`, `docs/02-design/`
- **GitHub**: https://github.com/haemiru/class-register-claude (독립 git repo, `main` 브랜치)
- **Vercel**: junominu's projects / 프로젝트명 `class-register-claude` (Vite preset, Root `./`)

## 2. 결정사항
- 관리자: ~~단일 비밀번호 → HMAC 토큰~~ → **Google OAuth(Supabase Auth) + `ADMIN_EMAILS` 허용목록** (2026-06-21 전환)
- 정원 마감: 마감 시 신청 차단. 정합성은 `cr_register_paid` 트랜잭션 RPC
- Supabase: 신규 프로젝트(ref `bjouyodzelcoghhxdfsv`), 접두사 `cr_`
- 신청정보: 이름 + 연락처 + **사전 질문(note, 선택)** / 결제 후: 신청 내역 확인 화면 (이메일·알림톡 없음)
- 디자인: **바이브 코딩 테마**(다크 + 보라→시안 네온 그라데이션, 글래스 카드, JetBrains Mono)

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

## 4. 다음 할 일 (돌아오면 여기부터)
1. **⚠️ Supabase 마이그레이션 실행 필요** (note 추가분 — 아직 SQL Editor에서 안 돌렸으면):
   ```sql
   alter table cr_registrations add column if not exists note text;
   drop function if exists cr_register_paid(uuid, text, text, text, text, int);
   -- 이후 schema.sql 의 새 cr_register_paid(p_note 포함) 재생성
   ```
2. **결제 흐름 E2E 테스트**: 토스 테스트 키로 신청→결제→완료→관리자 목록 확인
3. 히어로 문구/서브카피 실제 강의 성격에 맞게 확정 (현재 임시: "코딩, 바이브로 시작하세요")
4. 실 운영 키 전환 (토스 라이브 키), 도메인 연결 시 Supabase Redirect URLs 추가

## 5. 주의
- 서버 키(service_role, TOSS_SECRET_KEY)는 `VITE_` 접두사 금지 (클라이언트 노출됨)
- 관리자 권한은 `ADMIN_EMAILS`(쉼표 구분)로만 결정. 현재 관리자 = `junominu@gmail.com`
- 구글 로그인: Supabase Auth Google provider **활성화 토글 ON + Save** 필수 (안 켜면 "provider is not enabled")
- 두 URL 구분: 구글 "승인된 리디렉션 URI" = Supabase 콜백(`...supabase.co/auth/v1/callback`) / Supabase "Redirect URLs" = 앱 주소(`.../admin`)
- 환경변수 변경 후에는 Vercel **Redeploy** 해야 적용됨
- 이 repo는 독립 git repo (Claude-prj 모노레포와 별개)

## 6. 환경변수 (Vercel, 총 6개)
| 변수 | 구분 | 값 |
|---|---|---|
| `VITE_SUPABASE_URL` | 클라이언트 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 클라이언트 | Publishable key (`sb_publishable_...`) |
| `VITE_TOSS_CLIENT_KEY` | 클라이언트 | 토스 client key |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 | Secret key (`sb_secret_...`) |
| `TOSS_SECRET_KEY` | 서버 | 토스 secret key |
| `ADMIN_EMAILS` | 서버 | 관리자 Google 계정 (쉼표 구분) |
