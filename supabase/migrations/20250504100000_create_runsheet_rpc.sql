-- Reliable runsheet creation from the app: runs as SECURITY DEFINER so a
-- misconfigured runsheets INSERT RLS policy cannot block legitimate creates.
-- auth.uid() is still the signed-in user from the request JWT.

create or replace function public.create_runsheet(
  p_title text,
  p_timezone text default 'UTC'
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

  v_tz := coalesce(nullif(trim(p_timezone), ''), 'UTC');

  insert into public.runsheets (title, owner_id, timezone)
  values (trim(p_title), v_uid, v_tz)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_runsheet(text, text) from PUBLIC;
grant execute on function public.create_runsheet(text, text) to authenticated;
