-- Reliable invite creation, mirroring create_runsheet.
--
-- Writing to runsheet_invites directly depends on its RLS policies behaving, and on some
-- deployed databases they do not (the owner cannot read invites back, and delete does not
-- clear the row — so re-inviting the same address collides with the unique index on
-- (runsheet_id, lower(email))). This SECURITY DEFINER function runs with the owner check
-- done explicitly in SQL, so it is immune to those policy quirks. It upserts, so
-- re-inviting an address just refreshes its token, and returns the token for the caller to
-- build the share link.

create or replace function public.create_runsheet_invite(
  p_runsheet_id uuid,
  p_email text,
  p_role text default 'editor'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text;
  v_role text;
  v_token text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.runsheets r
    where r.id = p_runsheet_id and r.owner_id = v_uid
  ) then
    raise exception 'not_owner';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if v_email = '' then
    raise exception 'missing_email';
  end if;

  v_role := case when p_role = 'viewer' then 'viewer' else 'editor' end;
  -- Schema-qualify: pgcrypto lives in the `extensions` schema on Supabase, which is not
  -- on this function's search_path. Unqualified, it fails with "function does not exist".
  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.runsheet_invites (runsheet_id, email, role, token, invited_by)
  values (p_runsheet_id, v_email, v_role, v_token, v_uid)
  on conflict (runsheet_id, lower(email))
  do update set
    role = excluded.role,
    token = excluded.token,
    invited_by = excluded.invited_by,
    accepted_at = null
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.create_runsheet_invite(uuid, text, text) from public;
grant execute on function public.create_runsheet_invite(uuid, text, text) to authenticated;
