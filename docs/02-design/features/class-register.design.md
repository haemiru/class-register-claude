# Design: 강의신청 페이지 (class-register)

> PDCA Phase: **Design** · Created: 2026-06-20 · Architecture: **C. Pragmatic Balance**
> Stack: Vite + React + Tailwind + Supabase + Vercel Serverless · PG: 토스페이먼츠

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 강의 모집의 신청·정원·결제를 한 흐름으로 자동화해 수작업 오류와 정산 부담을 없앤다. |
| **WHO** | 관리자(강의 개설자 1명) · 참여자(수강 신청자, 비로그인 일반 사용자) |
| **RISK** | 결제는 됐는데 신청이 미확정되는 정합성 깨짐 / 동시 신청으로 인한 정원 초과 / PG 키·관리자 비밀번호 노출 |
| **SUCCESS** | 결제 성공 건은 100% 신청 확정으로 기록되고, 정원 초과 신청이 0건이다. |
| **SCOPE** | IN: 강의 CRUD, 신청 흐름, 토스 카드결제, 정원 마감 차단, 신청자 목록. OUT(차후): 이메일/알림톡, 환불 자동화, 다중 관리자, 쿠폰·할인. |

---

## 1. Overview

C 안의 핵심 원칙: **"돈·정원이 걸린 쓰기는 서버(Serverless)로 보호하고, 공개 조회는 가볍게 Supabase 클라이언트로 처리한다."**

- 공개 강의 목록/상세 조회 → 브라우저에서 Supabase anon 키로 직접 read (RLS: public read)
- 신청 생성·결제 승인·정원 카운트 → Vercel Serverless Function에서 service_role 키로 처리 (클라이언트 신뢰 안 함)
- 관리자 인증·강의 CRUD → Serverless에서 관리자 비밀번호 검증 후 처리
- 토스 시크릿 키·관리자 비번·service_role 키는 **서버 환경변수 전용** (클라이언트 번들 금지)

## 2. Architecture Diagram (논리)

```
[Browser / React SPA]
   │  (1) 공개 조회: 강의 목록/상세
   ├──────────────► Supabase (anon key, RLS public read)  → cr_classes
   │
   │  (2) 신청 시작: 토스 결제위젯 호출 (clientKey)
   ├──────────────► TossPayments SDK (결제창)
   │                      │ 결제 인증 성공 → successUrl?paymentKey&orderId&amount
   │  (3) 결제 승인 확정
   ├──────────────► [Vercel Serverless] /api/confirm-payment
   │                      │ a. 토스 /v1/payments/confirm (secretKey 검증)
   │                      │ b. 정원 재확인 (paid count < capacity)
   │                      │ c. cr_registrations insert (status='paid')  [service_role]
   │                      ▼
   │  (4) 관리자
   └──────────────► [Vercel Serverless] /api/admin/*  (비번 검증 → CRUD)
                          ▼
                       Supabase (service_role) → cr_classes / cr_registrations
```

## 3. Tech Stack & Project Setup

- **Frontend**: Vite + React 18 + React Router + Tailwind CSS
- **Backend**: Vercel Serverless Functions (`/api/*.js`, Node 런타임)
- **DB**: Supabase (Postgres) — 신규 프로젝트, 접두사 `cr_`
- **PG**: 토스페이먼츠 (결제위젯 SDK + Payments Confirm API)
- **배포**: Vercel (Root Directory = `class-register/`)

### 환경변수

| 키 | 위치 | 용도 |
|----|------|------|
| `VITE_SUPABASE_URL` | 클라이언트 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 클라이언트 | 공개 read용 anon 키 |
| `VITE_TOSS_CLIENT_KEY` | 클라이언트 | 토스 결제위젯 clientKey |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | 서버리스 쓰기용 |
| `TOSS_SECRET_KEY` | **서버 전용** | 결제 승인 검증 |
| `ADMIN_PASSWORD` | **서버 전용** | 관리자 인증 |

## 4. Data Model & RLS (Supabase, 접두사 `cr_`)

```sql
create table cr_classes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  location    text not null,
  starts_at   timestamptz not null,
  capacity    int  not null check (capacity > 0),
  fee         int  not null check (fee >= 0),
  status      text not null default 'open',   -- 'open' | 'closed'
  created_at  timestamptz not null default now()
);

create table cr_registrations (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references cr_classes(id) on delete cascade,
  name             text not null,
  phone            text not null,
  payment_status   text not null default 'pending', -- 'pending'|'paid'|'failed'
  toss_payment_key text,
  toss_order_id    text unique,        -- 멱등성: 동일 주문 중복 승인 방지
  amount           int,
  created_at       timestamptz not null default now()
);

create index cr_reg_class_paid_idx on cr_registrations(class_id, payment_status);
```

**RLS 정책**
- `cr_classes`: `select` 는 `status='open'` 행에 한해 anon 허용. insert/update/delete 는 차단(서버 service_role 만).
- `cr_registrations`: anon 전면 차단. 모든 접근은 서버 service_role 경유.

**정원 정합성 전략**
- 1차: confirm-payment 서버 함수에서 `count(paid) < capacity` 재확인 후 insert.
- 2차(보강): `toss_order_id unique` 로 중복 승인 멱등 차단. 동시성 한계 시 Postgres 함수(트랜잭션 내 count+insert)로 승격 — Design Open으로 표기, Do에서 1차 우선 구현.

## 5. API Contract (Serverless)

| Method | Route | 인증 | 요청 | 응답 |
|--------|-------|------|------|------|
| POST | `/api/confirm-payment` | 없음(토스 검증) | `{ paymentKey, orderId, amount, classId, name, phone }` | `200 {registration}` / `400 {error}` / `409 {error:'FULL'}` |
| POST | `/api/admin/login` | — | `{ password }` | `200 {token}` / `401` |
| GET | `/api/admin/classes` | 토큰 | — | `200 {classes[]}` |
| POST | `/api/admin/classes` | 토큰 | `{title,description,location,starts_at,capacity,fee}` | `201 {class}` |
| PATCH | `/api/admin/classes/:id` | 토큰 | 부분 필드 (status='closed' 마감 포함) | `200 {class}` |
| GET | `/api/admin/classes/:id/registrations` | 토큰 | — | `200 {registrations[]}` |

- 관리자 토큰: 비번 검증 후 서명 토큰(또는 단순 HMAC) 발급 → 이후 요청 헤더 `Authorization: Bearer`.
- `confirm-payment` 흐름: 토스 confirm 성공 → amount 일치 확인 → 정원 확인 → registration `paid` insert. 실패 시 결제 취소 안내 응답.

## 6. Frontend Structure & Routes

```
class-register/
├─ api/                       # Vercel Serverless
│  ├─ confirm-payment.js
│  └─ admin/
│     ├─ login.js
│     ├─ classes/index.js     # GET list / POST create
│     └─ classes/[id].js      # PATCH update / nested registrations
├─ src/
│  ├─ main.jsx, App.jsx (router)
│  ├─ lib/
│  │  ├─ supabase.js          # anon client (public read)
│  │  └─ toss.js              # 결제위젯 헬퍼
│  ├─ pages/
│  │  ├─ ClassList.jsx        # / 공개 강의 목록
│  │  ├─ ClassDetail.jsx      # /class/:id 상세+신청 폼
│  │  ├─ Success.jsx          # /success 결제승인→확정화면
│  │  ├─ Fail.jsx             # /fail 결제실패
│  │  └─ admin/
│  │     ├─ AdminLogin.jsx    # /admin
│  │     ├─ AdminClasses.jsx  # /admin/classes (목록+등록폼)
│  │     └─ AdminRegistrations.jsx # /admin/classes/:id
│  └─ components/ (ClassCard, RegistrationForm, Field, ...)
├─ index.html, vite.config.js, tailwind.config.js, package.json
└─ docs/ (PDCA)
```

| Route | 화면 | 핵심 동작 |
|-------|------|-----------|
| `/` | 강의 목록 | 공개 강의 카드(정원/마감 표시) |
| `/class/:id` | 강의 상세 + 신청 | 이름·연락처 입력 → 토스 결제위젯 호출. 마감 시 버튼 비활성 |
| `/success` | 결제 확인 | confirm-payment 호출 → 신청 확정 내역 표시 |
| `/fail` | 결제 실패 | 실패 사유 안내, 재시도 |
| `/admin` | 관리자 로그인 | 비번 입력 → 토큰 |
| `/admin/classes` | 강의 관리 | 등록 폼 + 목록(수정/마감) |
| `/admin/classes/:id` | 신청자 목록 | 이름·연락처·결제상태·시각 |

## 7. Key Flows (상세)

**참여자 결제 흐름 (정합성 핵심)**
1. `/class/:id` 신청 폼 제출 → orderId 생성, 토스 결제위젯 `requestPayment` 호출
2. 카드 인증 성공 → 토스가 `/success?paymentKey&orderId&amount` 로 리다이렉트
3. `Success.jsx` 가 `/api/confirm-payment` 호출
4. 서버: 토스 confirm(secretKey) → amount/fee 일치 확인 → `count(paid) < capacity` 확인 → registration `paid` insert(멱등: orderId unique)
5. 성공 시 확정 화면. 정원 초과(409)면 결제 취소 안내. 실패면 `/fail`

## 8. Test Plan (Check 단계 대비)

- **L1 (API)**: `confirm-payment` — 정상 승인 200 / 금액 불일치 400 / 정원초과 409 / 중복 orderId 멱등. `admin/login` 401·200. 관리자 라우트 토큰 없을 때 401.
- **L2 (UI 액션)**: 강의 선택→결제위젯 호출 트리거, 마감 강의 신청 버튼 disabled, 관리자 강의 등록 후 목록 반영.
- **L3 (E2E)**: 강의 등록(관리자) → 목록 노출 → 신청+결제(테스트키) → 확정 화면 → 신청자 목록에 표시.

## 9. Security

- 시크릿 키(토스 secret, service_role, ADMIN_PASSWORD)는 서버 환경변수 전용 — 클라이언트 번들 금지 (메모리: API 키 보안 원칙).
- 결제 금액은 서버에서 강의 `fee` 와 대조(클라이언트 amount 신뢰 금지).
- RLS로 registrations 직접 접근 차단.

## 10. Open Questions → Do 단계 결정

- 정원 동시성: 1차 서버 count-확인 우선. 부하 우려 시 Postgres RPC(트랜잭션) 승격.
- 관리자 토큰: 단순 HMAC 서명 토큰으로 시작(만료 포함).

## 11. Implementation Guide

### 11.1 구현 순서

1. 프로젝트 셋업 + Supabase 스키마/RLS + 환경변수 골격
2. 공개 조회: 강의 목록/상세 (Supabase anon read)
3. 관리자: 로그인 + 강의 CRUD + 신청자 목록 (Serverless)
4. 결제: 토스 결제위젯 + confirm-payment 서버 승인 + 정원/정합성
5. 결제 확인/실패 화면 + 배포(Vercel)

### 11.2 Module Map

| 모듈 키 | 범위 | 산출물 |
|---------|------|--------|
| `module-1` | 셋업·스키마·환경변수 | Vite/Tailwind 골격, `cr_*` 테이블+RLS, supabase.js |
| `module-2` | 공개 조회 | ClassList, ClassDetail, ClassCard |
| `module-3` | 관리자 | admin/login, classes API, AdminLogin/AdminClasses/AdminRegistrations |
| `module-4` | 결제·정합성 | toss.js, confirm-payment, RegistrationForm, Success/Fail |
| `module-5` | 마감 차단·배포 | 정원 마감 UI, Vercel 배포 설정 |

### 11.3 Session Guide (권장 세션 분할)

- **세션 1**: `module-1` + `module-2` (셋업~공개 조회까지 눈에 보이는 결과)
- **세션 2**: `module-3` (관리자 강의 등록/목록)
- **세션 3**: `module-4` + `module-5` (결제 정합성 + 마감 + 배포) — 핵심·고난도

`/pdca do class-register --scope module-1,module-2` 처럼 부분 구현 가능.

---

_다음 단계: `/pdca do class-register --scope module-1,module-2` (또는 전체 `/pdca do class-register`)_
