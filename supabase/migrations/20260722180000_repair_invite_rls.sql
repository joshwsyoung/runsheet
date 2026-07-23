-- Repair the invite access rules on databases where they drifted from the repo.
--
-- Symptoms this fixes: the owner cannot read pending invites back, and delete does not
-- clear an invite row (so re-inviting collides with the unique index). Everything here is
-- idempotent — safe to run whether or not the objects already exist — and simply re-asserts
-- the definitions the app expects.

-- Ownership / access helpers (SECURITY DEFINER so RLS can call them).
create or replace function public.user_can_access_runsheet(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.runsheets r
    where r.id = rid
      and (
        r.owner_id = (select auth.uid())
        or exists (
          select 1 from public.runsheet_members m
          where m.runsheet_id = r.id and m.user_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function public.user_owns_runsheet(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.runsheets r
    where r.id = rid and r.owner_id = (select auth.uid())
  );
$$;

-- Invite policies.
drop policy if exists "invites_select_access_or_recipient" on public.runsheet_invites;
create policy "invites_select_access_or_recipient"
  on public.runsheet_invites for select
  using (
    public.user_can_access_runsheet(runsheet_id)
    or (
      (select auth.uid()) is not null
      and lower(email) = lower((select email from auth.users where id = (select auth.uid())))
      and accepted_at is null
    )
  );

drop policy if exists "invites_insert_owner" on public.runsheet_invites;
create policy "invites_insert_owner"
  on public.runsheet_invites for insert
  with check (
    public.user_owns_runsheet(runsheet_id)
    and invited_by = (select auth.uid())
  );

drop policy if exists "invites_delete_owner" on public.runsheet_invites;
create policy "invites_delete_owner"
  on public.runsheet_invites for delete
  using (public.user_owns_runsheet(runsheet_id));
