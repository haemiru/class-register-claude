-- 마이그레이션: 클래스별 문진 유형(form_type) 추가
-- 기존 운영 DB(classregi_* 이미 존재)에 1회 실행. schema.sql 전체 재실행 대신 이 파일만 실행해도 됨.
-- (신규/다른 프로젝트는 schema.sql 1회 실행이면 이 내용이 포함되어 있음)

-- 1) 클래스 테이블에 form_type 컬럼 추가 (기존 행은 기본값 'baby')
alter table classregi_classes
  add column if not exists form_type text not null default 'baby';

-- 2) 공개 조회 RPC 재정의 — 반환 컬럼에 form_type 추가.
--    RETURNS TABLE 시그니처가 바뀌므로 create or replace 로는 안 되고 drop 후 재생성해야 함.
drop function if exists classregi_open_classes();
create function classregi_open_classes()
returns table (
  id uuid, title text, description text, location text,
  starts_at timestamptz, capacity int, fee int, status text, form_type text,
  paid_count bigint
)
language sql security definer set search_path = public
as $$
  select c.id, c.title, c.description, c.location, c.starts_at,
         c.capacity, c.fee, c.status, c.form_type,
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
  starts_at timestamptz, capacity int, fee int, status text, form_type text,
  paid_count bigint
)
language sql security definer set search_path = public
as $$
  select c.id, c.title, c.description, c.location, c.starts_at,
         c.capacity, c.fee, c.status, c.form_type,
         coalesce((select count(*) from classregi_registrations
                   where class_id = c.id and payment_status = 'paid'), 0) as paid_count
  from classregi_classes c
  where c.id = p_id;
$$;

grant execute on function classregi_open_classes() to anon, authenticated;
grant execute on function classregi_class_detail(uuid) to anon, authenticated;
