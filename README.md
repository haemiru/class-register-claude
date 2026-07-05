# 클래스 신청 페이지 (class-register)

관리자가 클래스(날짜·장소·주제·정원·참가비)를 등록하면, 참여자가 클래스를 선택해 **카드결제**까지 한 흐름으로 신청을 완료하는 웹앱.

- **Stack**: Vite + React + Tailwind + Supabase + Vercel Serverless
- **PG**: 토스페이먼츠 (결제위젯 + 서버 승인 검증)
- **아키텍처**: C. Pragmatic Balance — 돈·정원이 걸린 쓰기는 서버리스로 보호, 공개 조회는 Supabase 클라이언트

## 빠른 시작

```bash
npm install
cp .env.example .env      # 값 채우기 (아래 참고)
npm run dev               # 프론트만 (localhost:5173)
# /api 까지 함께 테스트하려면: npx vercel dev
```

## 환경변수 (.env)

| 키 | 위치 | 설명 |
|----|------|------|
| `VITE_SUPABASE_URL` | 클라이언트 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 클라이언트 | anon 공개 키 |
| `VITE_TOSS_CLIENT_KEY` | 클라이언트 | 토스 결제위젯 clientKey (test_ck_…) |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | 서버리스 쓰기용 (노출 금지) |
| `TOSS_SECRET_KEY` | **서버 전용** | 결제 승인 검증 (test_sk_…) |
| `ADMIN_EMAILS` | **서버 전용** | 관리자 허용 Google 계정(쉼표로 여러 개) |

> ⚠️ 서버 전용 키에는 `VITE_` 접두사를 붙이지 마세요. 붙이면 클라이언트 번들에 노출됩니다.

### 관리자 인증 (Google 로그인)

- 관리자 페이지는 **Supabase Auth의 Google OAuth**로 로그인하며, `ADMIN_EMAILS`에 등록된 계정만 통과합니다.
- Supabase 대시보드 → **Authentication → Providers → Google** 활성화 필요
  (Google Cloud Console에서 OAuth 클라이언트 ID/시크릿 발급 후 등록).
- Authorized redirect URI에 `https://<배포도메인>/admin` 과 Supabase 콜백 URL을 등록하세요.

## Supabase 준비

1. 새 Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
   - `classregi_classes`, `classregi_registrations` 테이블 + RLS
   - 공개 조회 RPC(`classregi_open_classes`, `classregi_class_detail`) — 집계만 노출
   - 정원 정합성 RPC(`classregi_register_paid`) — 트랜잭션 내 정원 확인 후 insert
3. Project Settings → API 에서 URL / anon / service_role 키 확보

## 토스페이먼츠

- [개발자센터](https://developers.tosspayments.com)에서 테스트 키 발급
- clientKey → `VITE_TOSS_CLIENT_KEY`, secretKey → `TOSS_SECRET_KEY`
- 실 운영 전환 시 라이브 키로 교체

## 화면

| 경로 | 설명 |
|------|------|
| `/` | 공개 클래스 목록 (모집중/마감 표시) |
| `/class/:id` | 클래스 상세 + 신청서 + 결제 |
| `/success` `/fail` | 결제 결과 |
| `/admin` | 관리자 로그인 |
| `/admin/classes` | 클래스 등록·목록·마감 |
| `/admin/classes/:id` | 클래스별 신청자 목록 |

## 배포 (Vercel)

1. Vercel 새 프로젝트 → Root Directory = `class-register`
2. Framework Preset = Vite
3. 위 환경변수 7개를 Vercel 환경변수에 등록 (서버 키는 절대 `VITE_` 없이)
4. Deploy. `/api/*` 는 자동으로 서버리스 함수로 배포됨

## 결제 정합성 (핵심)

```
신청서 → 토스 결제창 → /success → /api/confirm-payment
   → 토스 승인(secretKey) → 금액 대조 → 정원 확인(RPC) → paid insert
   → 정원 레이스 시 결제 자동 취소 + 409
```

- 금액은 서버에서 클래스 `fee`와 대조 (클라이언트 amount 신뢰 안 함)
- `toss_order_id` unique 로 중복 승인 멱등 차단
- 정원 확인+insert 는 `classregi_register_paid` 트랜잭션 RPC로 동시성 안전
