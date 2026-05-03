-- Runsheet initial schema + RLS

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = (select auth.uid()));

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  using (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- runsheets
-- ---------------------------------------------------------------------------
create table public.runsheets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index runsheets_owner_id_idx on public.runsheets (owner_id);

-- ---------------------------------------------------------------------------
-- runsheet_members
-- ---------------------------------------------------------------------------
create table public.runsheet_members (
  runsheet_id uuid not null references public.runsheets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (runsheet_id, user_id)
);

create index runsheet_members_user_id_idx on public.runsheet_members (user_id);

create or replace function public.user_can_access_runsheet(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.runsheets r
    where r.id = rid
      and (
        r.owner_id = (select auth.uid())
        or exists (
          select 1
          from public.runsheet_members m
          where m.runsheet_id = r.id
            and m.user_id = (select auth.uid())
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
    select 1
    from public.runsheets r
    where r.id = rid
      and r.owner_id = (select auth.uid())
  );
$$;

alter table public.runsheets enable row level security;

create policy "runsheets_select_access"
  on public.runsheets for select
  using (public.user_can_access_runsheet(id));

create policy "runsheets_insert_owner"
  on public.runsheets for insert
  with check (owner_id = (select auth.uid()));

create policy "runsheets_update_owner_or_editor"
  on public.runsheets for update
  using (
    public.user_owns_runsheet(id)
    or exists (
      select 1 from public.runsheet_members m
      where m.runsheet_id = runsheets.id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'editor')
    )
  );

create policy "runsheets_delete_owner"
  on public.runsheets for delete
  using (owner_id = (select auth.uid()));

alter table public.runsheet_members enable row level security;

create policy "members_select_access"
  on public.runsheet_members for select
  using (public.user_can_access_runsheet(runsheet_id));

create policy "members_insert_owner"
  on public.runsheet_members for insert
  with check (public.user_owns_runsheet(runsheet_id));

create policy "members_delete_owner_or_self"
  on public.runsheet_members for delete
  using (
    public.user_owns_runsheet(runsheet_id)
    or user_id = (select auth.uid())
  );

-- Owner row inserted by trigger (below)

-- ---------------------------------------------------------------------------
-- runsheet_invites
-- ---------------------------------------------------------------------------
create table public.runsheet_invites (
  id uuid primary key default gen_random_uuid(),
  runsheet_id uuid not null references public.runsheets (id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index runsheet_invites_runsheet_email_lower_idx
  on public.runsheet_invites (runsheet_id, lower(email));

alter table public.runsheet_invites enable row level security;

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

create policy "invites_insert_owner"
  on public.runsheet_invites for insert
  with check (
    public.user_owns_runsheet(runsheet_id)
    and invited_by = (select auth.uid())
  );

create policy "invites_delete_owner"
  on public.runsheet_invites for delete
  using (public.user_owns_runsheet(runsheet_id));

-- ---------------------------------------------------------------------------
-- runsheet_days
-- ---------------------------------------------------------------------------
create table public.runsheet_days (
  id uuid primary key default gen_random_uuid(),
  runsheet_id uuid not null references public.runsheets (id) on delete cascade,
  day_date date not null,
  label text,
  is_special boolean not null default false,
  unique (runsheet_id, day_date)
);

create index runsheet_days_runsheet_id_idx on public.runsheet_days (runsheet_id);

alter table public.runsheet_days enable row level security;

create policy "days_select_access"
  on public.runsheet_days for select
  using (public.user_can_access_runsheet(runsheet_id));

create policy "days_insert_editor"
  on public.runsheet_days for insert
  with check (
    public.user_can_access_runsheet(runsheet_id)
    and (
      public.user_owns_runsheet(runsheet_id)
      or exists (
        select 1 from public.runsheet_members m
        where m.runsheet_id = runsheet_days.runsheet_id
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
    )
  );

create policy "days_update_editor"
  on public.runsheet_days for update
  using (
    public.user_can_access_runsheet(runsheet_id)
    and (
      public.user_owns_runsheet(runsheet_id)
      or exists (
        select 1 from public.runsheet_members m
        where m.runsheet_id = runsheet_days.runsheet_id
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
    )
  );

create policy "days_delete_editor"
  on public.runsheet_days for delete
  using (
    public.user_can_access_runsheet(runsheet_id)
    and (
      public.user_owns_runsheet(runsheet_id)
      or exists (
        select 1 from public.runsheet_members m
        where m.runsheet_id = runsheet_days.runsheet_id
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- slots
-- ---------------------------------------------------------------------------
create table public.slots (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.runsheet_days (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  activity_type text not null default 'other',
  title text,
  description text,
  description_bullets jsonb not null default '[]'::jsonb,
  link_url text,
  preview_title text,
  preview_description text,
  preview_image_url text,
  preview_fetched_at timestamptz,
  booking_ref text,
  contact_info text,
  open_ended boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index slots_day_id_idx on public.slots (day_id);

alter table public.slots enable row level security;

create policy "slots_select_access"
  on public.slots for select
  using (
    exists (
      select 1
      from public.runsheet_days d
      where d.id = slots.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
    )
  );

create policy "slots_insert_editor"
  on public.slots for insert
  with check (
    exists (
      select 1
      from public.runsheet_days d
      where d.id = slots.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
        and (
          public.user_owns_runsheet(d.runsheet_id)
          or exists (
            select 1 from public.runsheet_members m
            where m.runsheet_id = d.runsheet_id
              and m.user_id = (select auth.uid())
              and m.role in ('owner', 'editor')
          )
        )
    )
  );

create policy "slots_update_editor"
  on public.slots for update
  using (
    exists (
      select 1
      from public.runsheet_days d
      where d.id = slots.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
        and (
          public.user_owns_runsheet(d.runsheet_id)
          or exists (
            select 1 from public.runsheet_members m
            where m.runsheet_id = d.runsheet_id
              and m.user_id = (select auth.uid())
              and m.role in ('owner', 'editor')
          )
        )
    )
  );

create policy "slots_delete_editor"
  on public.slots for delete
  using (
    exists (
      select 1
      from public.runsheet_days d
      where d.id = slots.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
        and (
          public.user_owns_runsheet(d.runsheet_id)
          or exists (
            select 1 from public.runsheet_members m
            where m.runsheet_id = d.runsheet_id
              and m.user_id = (select auth.uid())
              and m.role in ('owner', 'editor')
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- checklist_items
-- ---------------------------------------------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.runsheet_days (id) on delete cascade,
  label text not null,
  done boolean not null default false,
  sort_order int not null default 0
);

create index checklist_items_day_id_idx on public.checklist_items (day_id);

alter table public.checklist_items enable row level security;

create policy "checklist_select_access"
  on public.checklist_items for select
  using (
    exists (
      select 1 from public.runsheet_days d
      where d.id = checklist_items.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
    )
  );

create policy "checklist_insert_editor"
  on public.checklist_items for insert
  with check (
    exists (
      select 1 from public.runsheet_days d
      where d.id = checklist_items.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
        and (
          public.user_owns_runsheet(d.runsheet_id)
          or exists (
            select 1 from public.runsheet_members m
            where m.runsheet_id = d.runsheet_id
              and m.user_id = (select auth.uid())
              and m.role in ('owner', 'editor')
          )
        )
    )
  );

create policy "checklist_update_editor"
  on public.checklist_items for update
  using (
    exists (
      select 1 from public.runsheet_days d
      where d.id = checklist_items.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
        and (
          public.user_owns_runsheet(d.runsheet_id)
          or exists (
            select 1 from public.runsheet_members m
            where m.runsheet_id = d.runsheet_id
              and m.user_id = (select auth.uid())
              and m.role in ('owner', 'editor')
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.runsheet_days d
      where d.id = checklist_items.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
        and (
          public.user_owns_runsheet(d.runsheet_id)
          or exists (
            select 1 from public.runsheet_members m
            where m.runsheet_id = d.runsheet_id
              and m.user_id = (select auth.uid())
              and m.role in ('owner', 'editor')
          )
        )
    )
  );

create policy "checklist_delete_editor"
  on public.checklist_items for delete
  using (
    exists (
      select 1 from public.runsheet_days d
      where d.id = checklist_items.day_id
        and public.user_can_access_runsheet(d.runsheet_id)
        and (
          public.user_owns_runsheet(d.runsheet_id)
          or exists (
            select 1 from public.runsheet_members m
            where m.runsheet_id = d.runsheet_id
              and m.user_id = (select auth.uid())
              and m.role in ('owner', 'editor')
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- triggers: profile + owner member row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.runsheet_after_insert_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.runsheet_members (runsheet_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger runsheet_insert_owner_member
  after insert on public.runsheets
  for each row execute function public.runsheet_after_insert_owner_member();

-- ---------------------------------------------------------------------------
-- accept invite (RPC)
-- ---------------------------------------------------------------------------
create or replace function public.accept_runsheet_invite(invite_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.runsheet_invites%rowtype;
  user_email text;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  select * into inv
  from public.runsheet_invites
  where token = invite_token
    and accepted_at is null;

  if not found then
    raise exception 'invite_not_found';
  end if;

  select lower(email) into user_email
  from auth.users
  where id = (select auth.uid());

  if user_email is distinct from lower(inv.email) then
    raise exception 'invite_email_mismatch';
  end if;

  insert into public.runsheet_members (runsheet_id, user_id, role)
  values (inv.runsheet_id, (select auth.uid()), inv.role)
  on conflict (runsheet_id, user_id) do update set role = excluded.role;

  update public.runsheet_invites
  set accepted_at = now()
  where id = inv.id;
end;
$$;

grant execute on function public.accept_runsheet_invite(text) to authenticated;

-- Public invite preview (token-only; no row leakage without token)
create or replace function public.peek_invite(invite_token text)
returns table (
  runsheet_id uuid,
  title text,
  email text,
  accepted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.runsheet_id,
    r.title,
    i.email,
    (i.accepted_at is not null)
  from public.runsheet_invites i
  join public.runsheets r on r.id = i.runsheet_id
  where i.token = invite_token
  limit 1;
$$;

grant execute on function public.peek_invite(text) to anon, authenticated;
