-- 브레인센트 베이비 클래스 — 상세 신청 문진 마이그레이션
-- 기존 Supabase 프로젝트의 SQL Editor에서 1회 실행하세요. (재실행해도 안전)
-- schema.sql 을 새로 실행한 신규 프로젝트라면 이 파일은 필요 없습니다.

-- 1) cr_registrations 컬럼 추가
alter table cr_registrations add column if not exists email text;
alter table cr_registrations add column if not exists form_data jsonb not null default '{}'::jsonb;

-- 2) 무료 경로 RPC 확장 (email · form_data 저장). 기존 시그니처 제거 후 재생성.
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

-- 3) 유료 결제 승격 RPC: pending 행을 paid 로 (정원 원자 확인)
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
