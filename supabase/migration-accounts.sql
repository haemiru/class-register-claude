-- 마이그레이션: 참가자 계정(Supabase Auth) — 신청↔계정 연결 + 내 신청 조회
-- 기존 운영 DB 에 1회 실행. (신규 프로젝트는 schema.sql 에 이미 포함)

-- 1) 신청을 계정에 연결하는 user_id (익명 신청 하위호환 위해 nullable)
alter table classregi_registrations
  add column if not exists user_id uuid;
create index if not exists classregi_reg_user_idx on classregi_registrations(user_id);

-- 2) register_paid 에 p_user_id 추가 (무료 신청 경로에서 계정 연결).
--    기존 9-인자 시그니처를 drop 후 10-인자로 재생성.
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

-- 3) 로그인 사용자의 신청 목록 (auth.uid() 기준). 자료는 access_token 으로 기존 /my 재사용.
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
