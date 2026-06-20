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
  payment_status   text not null default 'pending',  -- 'pending'|'paid'|'failed'
  toss_payment_key text,
  toss_order_id    text unique,            -- 멱등성: 동일 주문 중복 승인 차단
  amount           int,
  created_at       timestamptz not null default now()
);

create index if not exists cr_reg_class_paid_idx
  on cr_registrations(class_id, payment_status);

-- ── RLS ───────────────────────────────────────────────
alter table cr_classes        enable row level security;
alter table cr_registrations  enable row level security;

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
create or replace function cr_register_paid(
  p_class_id uuid,
  p_name text,
  p_phone text,
  p_payment_key text,
  p_order_id text,
  p_amount int
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
    (class_id, name, phone, payment_status, toss_payment_key, toss_order_id, amount)
  values
    (p_class_id, p_name, p_phone, 'paid', p_payment_key, p_order_id, p_amount)
  returning * into v_row;

  return v_row;
end;
$$;
