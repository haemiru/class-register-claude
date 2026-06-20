# class-register 작업 로그

> 강의신청 페이지 — 관리자 강의 설정 + 참여자 카드결제. PDCA로 진행.

## 1. 개요
- **Stack**: Vite + React + Tailwind + Supabase + Vercel Serverless / **PG**: 토스페이먼츠
- **아키텍처**: C. Pragmatic Balance (돈·정원 쓰기는 서버리스, 공개 조회는 Supabase 클라이언트)
- **PDCA 문서**: `docs/01-plan/`, `docs/02-design/`

## 2. 결정사항
- 관리자: 단일 비밀번호 → HMAC 토큰(8h)
- 정원 마감: 마감 시 신청 차단. 정합성은 `cr_register_paid` 트랜잭션 RPC
- Supabase: 신규 프로젝트, 접두사 `cr_`
- 신청정보: 이름 + 연락처 / 결제 후: 신청 내역 확인 화면 (이메일·알림톡 없음)

## 3. 구현 완료 (Do, 2026-06-20)
- 설정: package.json, vite/tailwind/postcss, vercel.json, .env.example
- DB: `supabase/schema.sql` (테이블+RLS+RPC 3종)
- 프론트: ClassList, ClassDetail, Success, Fail, Admin(Login/Classes/Registrations), 공용 컴포넌트
- 서버리스: confirm-payment, admin/login, admin/classes(index/[id]), admin/registrations
- ✅ `npm run build` 통과

## 4. 다음 할 일 (돌아오면 여기부터)
1. **실 키 연결**: Supabase 새 프로젝트 생성 → `schema.sql` 실행 → `.env` 작성 (URL/anon/service_role)
2. 토스 테스트 키 발급 → `.env` (clientKey/secretKey)
3. `npx vercel dev` 로 결제 흐름 E2E 테스트 (테스트카드)
4. `/pdca analyze class-register` — Gap 분석 (서버 띄우면 L1 API 테스트 가능)
5. Vercel 배포 (Root Directory = class-register, 환경변수 7개 등록)

## 5. 주의
- 서버 키(service_role, TOSS_SECRET_KEY, ADMIN_PASSWORD)는 `VITE_` 접두사 금지 (클라이언트 노출됨)
- 원격 push 시 class-register는 Claude-prj 모노레포 하위 — 루트 git 상태 확인 후 커밋
