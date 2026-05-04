-- Trip bounds on runsheets (inclusive calendar dates in the sheet's TZ semantics).

alter table public.runsheets
  add column start_date date,
  add column end_date date;

-- Existing rows with days: use actual day span.
update public.runsheets r
set
  start_date = bd.min_d,
  end_date = bd.max_d
from (
  select runsheet_id, min(day_date) as min_d, max(day_date) as max_d
  from public.runsheet_days
  group by runsheet_id
) bd
where r.id = bd.runsheet_id
  and r.start_date is null;

-- Remaining rows: derive a week starting on local created date.
update public.runsheets r
set
  start_date = (
    (r.created_at at time zone coalesce(nullif(trim(r.timezone), ''), 'UTC'))::date
  ),
  end_date = (
    (r.created_at at time zone coalesce(nullif(trim(r.timezone), ''), 'UTC'))::date
  ) + 6
where r.start_date is null;

alter table public.runsheets
  alter column start_date set not null,
  alter column end_date set not null;

alter table public.runsheets
  add constraint runsheets_trip_dates_order check (start_date <= end_date);

drop function if exists public.create_runsheet(text, text);

create or replace function public.create_runsheet(
  p_title text,
  p_timezone text default 'UTC',
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_tz text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'missing_title';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'missing_dates';
  end if;

  if p_start_date > p_end_date then
    raise exception 'invalid_dates';
  end if;

  v_tz := coalesce(nullif(trim(p_timezone), ''), 'UTC');

  insert into public.runsheets (title, owner_id, timezone, start_date, end_date)
  values (trim(p_title), v_uid, v_tz, p_start_date, p_end_date)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_runsheet(text, text, date, date) from PUBLIC;
grant execute on function public.create_runsheet(text, text, date, date) to authenticated;
