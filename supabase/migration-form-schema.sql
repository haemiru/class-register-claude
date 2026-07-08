-- 마이그레이션: 클래스별 동적 신청 폼(form_schema) 추가
-- 기존 운영 DB(classregi_* 이미 존재)에 1회 실행. 재실행해도 안전.
-- (신규/다른 프로젝트는 schema.sql 1회 실행이면 이 내용이 포함되어 있음)
--
-- 배경: 기존엔 form_type('baby'|'basic')으로 프론트 하드코딩 템플릿을 가리키기만 했다.
--       이제 클래스마다 신청 문진 항목을 직접 구성해 form_schema(jsonb 필드 배열)에 저장한다.
--       form_type 은 레거시 폴백·프리셋용으로 남는다. form_schema 가 비면 form_type 템플릿으로 폴백.

-- 1) 클래스 테이블에 form_schema 컬럼 추가 (기존 행은 기본값 '[]' → 레거시 form_type 폴백)
alter table classregi_classes
  add column if not exists form_schema jsonb not null default '[]'::jsonb;

-- 2) 공개 조회 RPC 재정의 — 반환 컬럼에 form_schema 추가.
--    RETURNS TABLE 시그니처가 바뀌므로 create or replace 로는 안 되고 drop 후 재생성해야 함.
drop function if exists classregi_open_classes();
create function classregi_open_classes()
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
create function classregi_class_detail(p_id uuid)
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
