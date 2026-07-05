-- Design Ref: §4 — Data Model & RLS (접두사 cr_)
-- Supabase SQL Editor에서 1회 실행.

-- ── 강의 ──────────────────────────────────────────────
create table if not exists cr_classes (
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

-- ── 신청 ──────────────────────────────────────────────
create table if not exists cr_registrations (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references cr_classes(id) on delete cascade,
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
  created_at       timestamptz not null default now()
);

create index if not exists cr_reg_class_paid_idx
  on cr_registrations(class_id, payment_status);
create unique index if not exists cr_reg_access_token_idx
  on cr_registrations(access_token);

-- ── 강의 자료 ─────────────────────────────────────────
-- Design Ref: §4 — 강의별 첨부 자료. 결제 완료자만 다운로드(서버 서명 URL 경유).
create table if not exists cr_materials (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references cr_classes(id) on delete cascade,
  file_name    text not null,              -- 원본 파일명(표시용)
  storage_path text not null,              -- cr-materials 버킷 내 경로
  size         int,
  created_at   timestamptz not null default now()
);
create index if not exists cr_materials_class_idx on cr_materials(class_id);

-- ── RLS ───────────────────────────────────────────────
alter table cr_classes        enable row level security;
alter table cr_registrations  enable row level security;
alter table cr_materials      enable row level security;
-- cr_materials 는 anon 정책 없음 → 직접 접근 차단(서버 service_role 경유만).

-- ── Storage: 강의 자료 비공개 버킷 ───────────────────
-- 업로드/다운로드 모두 서버(service_role)·서명 URL 경유. anon 직접 접근 불가.
insert into storage.buckets (id, name, public)
values ('cr-materials', 'cr-materials', false)
on conflict (id) do nothing;

-- 공개 강의(open)만 anon 조회 허용. 쓰기는 전부 service_role(서버)만.
drop policy if exists cr_classes_public_read on cr_classes;
create policy cr_classes_public_read
  on cr_classes for select
  using (status = 'open');

-- cr_registrations 는 anon 정책 없음 → 직접 접근 차단(서버 service_role 경유만).
-- (service_role 키는 RLS 우회)

-- ── 공개 조회용 RPC (집계만 노출, 개인정보 X) ─────────
-- Design Ref: §6 — 클라이언트는 paid 카운트가 필요하나 cr_registrations 는 RLS 차단.
-- security definer 로 '개수'만 안전하게 노출.
create or replace function cr_open_classes()
returns table (
  id uuid, title text, description text, location text,
  starts_at timestamptz, capacity int, fee int, status text,
  paid_count bigint
)
language sql security definer set search_path = public
as $$
  select c.id, c.title, c.description, c.location, c.starts_at,
         c.capacity, c.fee, c.status,
         coalesce(p.cnt, 0) as paid_count
  from cr_classes c
  left join (
    select class_id, count(*) cnt
    from cr_registrations
    where payment_status = 'paid'
    group by class_id
  ) p on p.class_id = c.id
  where c.status = 'open'
  order by c.starts_at asc;
$$;

create or replace function cr_class_detail(p_id uuid)
returns table (
  id uuid, title text, description text, location text,
  starts_at timestamptz, capacity int, fee int, status text,
  paid_count bigint
)
language sql security definer set search_path = public
as $$
  select c.id, c.title, c.description, c.location, c.starts_at,
         c.capacity, c.fee, c.status,
         coalesce((select count(*) from cr_registrations
                   where class_id = c.id and payment_status = 'paid'), 0) as paid_count
  from cr_classes c
  where c.id = p_id;
$$;

grant execute on function cr_open_classes() to anon, authenticated;
grant execute on function cr_class_detail(uuid) to anon, authenticated;

-- ── 정원 정합성 보강용 RPC (선택) ─────────────────────
-- Design Ref: §4, §10 — 1차는 서버 count 확인, 부하 시 이 함수로 승격.
-- 트랜잭션 내에서 paid 카운트 확인 후 insert (동시성 안전).
drop function if exists cr_register_paid(uuid, text, text, text, text, int);
drop function if exists cr_register_paid(uuid, text, text, text, text, int, text);
create or replace function cr_register_paid(
  p_class_id uuid,
  p_name text,
  p_phone text,
  p_payment_key text,
  p_order_id text,
  p_amount int,
  p_note text default null,
  p_email text default null,
  p_form_data jsonb default '{}'::jsonb
) returns cr_registrations
language plpgsql
as $$
declare
  v_capacity int;
  v_paid     int;
  v_row      cr_registrations;
begin
  select capacity into v_capacity from cr_classes where id = p_class_id for update;
  if v_capacity is null then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  select count(*) into v_paid
    from cr_registrations
   where class_id = p_class_id and payment_status = 'paid';

  if v_paid >= v_capacity then
    raise exception 'FULL';
  end if;

  insert into cr_registrations
    (class_id, name, phone, email, note, form_data, payment_status, toss_payment_key, toss_order_id, amount)
  values
    (p_class_id, p_name, p_phone, p_email, p_note, coalesce(p_form_data, '{}'::jsonb),
     'paid', p_payment_key, p_order_id, p_amount)
  returning * into v_row;

  return v_row;
end;
$$;

-- ── 유료 결제 승격: pending 행을 paid 로 (정원 원자 확인) ──
-- Design Ref: §7 — pre-register 로 만든 pending 행을 결제 승인 후 확정.
-- 신청 데이터는 이미 pending 행에 있으므로 여기선 상태/결제키/금액만 갱신.
create or replace function cr_confirm_paid(
  p_order_id text,
  p_payment_key text,
  p_amount int
) returns cr_registrations
language plpgsql
as $$
declare
  v_class_id uuid;
  v_capacity int;
  v_paid     int;
  v_row      cr_registrations;
begin
  -- 대상 pending 행 확보(+ 클래스 락으로 동시성 보호)
  select class_id into v_class_id
    from cr_registrations
   where toss_order_id = p_order_id
   for update;
  if v_class_id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  select capacity into v_capacity from cr_classes where id = v_class_id for update;
  if v_capacity is null then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  select count(*) into v_paid
    from cr_registrations
   where class_id = v_class_id and payment_status = 'paid';

  if v_paid >= v_capacity then
    raise exception 'FULL';
  end if;

  update cr_registrations
     set payment_status   = 'paid',
         toss_payment_key = p_payment_key,
         amount           = p_amount
   where toss_order_id = p_order_id
  returning * into v_row;

  return v_row;
end;
$$;
grant execute on function cr_confirm_paid(text, text, int) to anon, authenticated;
