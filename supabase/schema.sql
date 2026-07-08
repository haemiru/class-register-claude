-- Design Ref: §4 — Data Model & RLS (접두사 classregi_)
-- Supabase SQL Editor에서 1회 실행.

-- ── 강의 ──────────────────────────────────────────────
create table if not exists classregi_classes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  location    text not null,
  starts_at   timestamptz not null,
  capacity    int  not null check (capacity > 0),
  fee         int  not null check (fee >= 0),
  status      text not null default 'open',   -- 'open' | 'closed'
  form_type   text not null default 'baby',    -- 레거시 문진 템플릿 유형(폴백/프리셋용: 'baby'|'basic')
  form_schema jsonb not null default '[]'::jsonb, -- 동적 신청 폼 필드 배열(폼 빌더). 비면 form_type 템플릿으로 폴백
  created_at  timestamptz not null default now()
);

-- ── 신청 ──────────────────────────────────────────────
create table if not exists classregi_registrations (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references classregi_classes(id) on delete cascade,
  name             text not null,
  phone            text not null,
  email            text,                              -- 자료 발송용
  note             text,                              -- 신청자 사전 질문(선택, 레거시)
  form_data        jsonb not null default '{}'::jsonb, -- 상세 문진 답변(아기 정보·수면/호흡·동의 등)
  payment_status   text not null default 'pending',  -- 'pending'|'paid'|'failed'|'refunded'
  toss_payment_key text,
  toss_order_id    text unique,            -- 멱등성: 동일 주문 중복 승인 차단
  amount           int,
  access_token     uuid not null default gen_random_uuid(),  -- 결제자 개인 자료 링크 토큰
  user_id          uuid,                                      -- 신청↔계정(Supabase Auth) 연결(익명 신청은 null)
  created_at       timestamptz not null default now()
);

create index if not exists classregi_reg_class_paid_idx
  on classregi_registrations(class_id, payment_status);
create unique index if not exists classregi_reg_access_token_idx
  on classregi_registrations(access_token);
create index if not exists classregi_reg_user_idx
  on classregi_registrations(user_id);

-- ── 강의 자료 ─────────────────────────────────────────
-- Design Ref: §4 — 강의별 첨부 자료. 결제 완료자만 다운로드(서버 서명 URL 경유).
create table if not exists classregi_materials (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references classregi_classes(id) on delete cascade,
  file_name    text not null,              -- 원본 파일명(표시용)
  storage_path text not null,              -- classregi-materials 버킷 내 경로
  size         int,
  created_at   timestamptz not null default now()
);
create index if not exists classregi_materials_class_idx on classregi_materials(class_id);

-- ── RLS ───────────────────────────────────────────────
alter table classregi_classes        enable row level security;
alter table classregi_registrations  enable row level security;
alter table classregi_materials      enable row level security;
-- classregi_materials 는 anon 정책 없음 → 직접 접근 차단(서버 service_role 경유만).

-- ── Storage: 강의 자료 비공개 버킷 ───────────────────
-- 업로드/다운로드 모두 서버(service_role)·서명 URL 경유. anon 직접 접근 불가.
insert into storage.buckets (id, name, public)
values ('classregi-materials', 'classregi-materials', false)
on conflict (id) do nothing;

-- 공개 강의(open)만 anon 조회 허용. 쓰기는 전부 service_role(서버)만.
drop policy if exists classregi_classes_public_read on classregi_classes;
create policy classregi_classes_public_read
  on classregi_classes for select
  using (status = 'open');

-- classregi_registrations 는 anon 정책 없음 → 직접 접근 차단(서버 service_role 경유만).
-- (service_role 키는 RLS 우회)

-- ── 공개 조회용 RPC (집계만 노출, 개인정보 X) ─────────
-- Design Ref: §6 — 클라이언트는 paid 카운트가 필요하나 classregi_registrations 는 RLS 차단.
-- security definer 로 '개수'만 안전하게 노출.
drop function if exists classregi_open_classes();
create or replace function classregi_open_classes()
returns table (
  id uuid, title text, description text, location text,
  starts_at timestamptz, capacity int, fee int, status text,
  form_type text, form_schema jsonb,
  paid_count bigint
)
language sql security definer set search_path = public
as $$
  select c.id, c.title, c.description, c.location, c.starts_at,
         c.capacity, c.fee, c.status, c.form_type, c.form_schema,
         coalesce(p.cnt, 0) as paid_count
  from classregi_classes c
  left join (
    select class_id, count(*) cnt
    from classregi_registrations
    where payment_status = 'paid'
    group by class_id
  ) p on p.class_id = c.id
  where c.status = 'open'
  order by c.starts_at asc;
$$;

drop function if exists classregi_class_detail(uuid);
create or replace function classregi_class_detail(p_id uuid)
returns table (
  id uuid, title text, description text, location text,
  starts_at timestamptz, capacity int, fee int, status text,
  form_type text, form_schema jsonb,
  paid_count bigint
)
language sql security definer set search_path = public
as $$
  select c.id, c.title, c.description, c.location, c.starts_at,
         c.capacity, c.fee, c.status, c.form_type, c.form_schema,
         coalesce((select count(*) from classregi_registrations
                   where class_id = c.id and payment_status = 'paid'), 0) as paid_count
  from classregi_classes c
  where c.id = p_id;
$$;

grant execute on function classregi_open_classes() to anon, authenticated;
grant execute on function classregi_class_detail(uuid) to anon, authenticated;

-- ── 정원 정합성 보강용 RPC (선택) ─────────────────────
-- Design Ref: §4, §10 — 1차는 서버 count 확인, 부하 시 이 함수로 승격.
-- 트랜잭션 내에서 paid 카운트 확인 후 insert (동시성 안전).
drop function if exists classregi_register_paid(uuid, text, text, text, text, int);
drop function if exists classregi_register_paid(uuid, text, text, text, text, int, text);
drop function if exists classregi_register_paid(uuid, text, text, text, text, int, text, text, jsonb);
create or replace function classregi_register_paid(
  p_class_id uuid,
  p_name text,
  p_phone text,
  p_payment_key text,
  p_order_id text,
  p_amount int,
  p_note text default null,
  p_email text default null,
  p_form_data jsonb default '{}'::jsonb,
  p_user_id uuid default null
) returns classregi_registrations
language plpgsql
as $$
declare
  v_capacity int;
  v_paid     int;
  v_row      classregi_registrations;
begin
  select capacity into v_capacity from classregi_classes where id = p_class_id for update;
  if v_capacity is null then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  select count(*) into v_paid
    from classregi_registrations
   where class_id = p_class_id and payment_status = 'paid';

  if v_paid >= v_capacity then
    raise exception 'FULL';
  end if;

  insert into classregi_registrations
    (class_id, name, phone, email, note, form_data, payment_status, toss_payment_key, toss_order_id, amount, user_id)
  values
    (p_class_id, p_name, p_phone, p_email, p_note, coalesce(p_form_data, '{}'::jsonb),
     'paid', p_payment_key, p_order_id, p_amount, p_user_id)
  returning * into v_row;

  return v_row;
end;
$$;

-- ── 유료 결제 승격: pending 행을 paid 로 (정원 원자 확인) ──
-- Design Ref: §7 — pre-register 로 만든 pending 행을 결제 승인 후 확정.
-- 신청 데이터는 이미 pending 행에 있으므로 여기선 상태/결제키/금액만 갱신.
create or replace function classregi_confirm_paid(
  p_order_id text,
  p_payment_key text,
  p_amount int
) returns classregi_registrations
language plpgsql
as $$
declare
  v_class_id uuid;
  v_capacity int;
  v_paid     int;
  v_row      classregi_registrations;
begin
  -- 대상 pending 행 확보(+ 클래스 락으로 동시성 보호)
  select class_id into v_class_id
    from classregi_registrations
   where toss_order_id = p_order_id
   for update;
  if v_class_id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  select capacity into v_capacity from classregi_classes where id = v_class_id for update;
  if v_capacity is null then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  select count(*) into v_paid
    from classregi_registrations
   where class_id = v_class_id and payment_status = 'paid';

  if v_paid >= v_capacity then
    raise exception 'FULL';
  end if;

  update classregi_registrations
     set payment_status   = 'paid',
         toss_payment_key = p_payment_key,
         amount           = p_amount
   where toss_order_id = p_order_id
  returning * into v_row;

  return v_row;
end;
$$;
grant execute on function classregi_confirm_paid(text, text, int) to anon, authenticated;

-- ── 참가자 계정: 내 신청 목록 (auth.uid() 기준) ──────────
-- Design Ref: §8 — 로그인 사용자가 자기 신청·자료(access_token)를 모아본다.
drop function if exists classregi_my_registrations();
create function classregi_my_registrations()
returns table (
  id uuid, class_id uuid, class_title text, starts_at timestamptz,
  payment_status text, amount int, access_token uuid, created_at timestamptz
)
language sql security definer set search_path = public
as $$
  select r.id, r.class_id, c.title, c.starts_at,
         r.payment_status, r.amount, r.access_token, r.created_at
  from classregi_registrations r
  join classregi_classes c on c.id = r.class_id
  where r.user_id = auth.uid()
  order by r.created_at desc;
$$;
grant execute on function classregi_my_registrations() to authenticated;
