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

## 4. 다음 할 일 (돌아오면 여기부터)
1. **⚠️ Supabase 마이그레이션 실행 필요** (자료 기능 — SQL Editor에서 아래 실행):
   ```sql
   -- 1) 개인 토큰
   alter table cr_registrations add column if not exists access_token uuid not null default gen_random_uuid();
   create unique index if not exists cr_reg_access_token_idx on cr_registrations(access_token);
   -- 2) 자료 테이블
   create table if not exists cr_materials (
     id uuid primary key default gen_random_uuid(),
     class_id uuid not null references cr_classes(id) on delete cascade,
     file_name text not null, storage_path text not null, size int,
     created_at timestamptz not null default now());
   create index if not exists cr_materials_class_idx on cr_materials(class_id);
   alter table cr_materials enable row level security;
   -- 3) 비공개 버킷
   insert into storage.buckets (id, name, public) values ('cr-materials','cr-materials',false)
     on conflict (id) do nothing;
   -- 4) RPC 재생성(access_token 반환 위해) — schema.sql 의 cr_register_paid 전체 블록 다시 실행
   ```
   → 실행 후 검증: `select column_name from information_schema.columns where table_name='cr_registrations' and column_name='access_token';`
2. **결제 흐름 E2E 테스트**: 토스 테스트 키로 신청→결제→완료→**내 자료 다운로드**→관리자 목록 확인
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
