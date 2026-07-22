-- Day status (travel / work / leave / free) + an unassigned "ideas" pool per runsheet.
--
-- Day status lets a trip mark which days are real leave and which are working days,
-- so the UI can keep working days deliberately sparse.
--
-- trip_ideas is the pool of places/activities that have been talked about but not yet
-- pinned to a day. `unconfirmed` marks a name we are not sure about (e.g. pulled from a
-- voice note) so the UI can show it as uncertain rather than presenting a guess as fact.

-- ---------------------------------------------------------------------------
-- runsheet_days.status
-- ---------------------------------------------------------------------------
alter table public.runsheet_days
  add column if not exists status text not null default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'runsheet_days_status_check'
  ) then
    alter table public.runsheet_days
      add constraint runsheet_days_status_check
      check (status in ('travel', 'work', 'leave', 'free'));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- trip_ideas
-- ---------------------------------------------------------------------------
create table if not exists public.trip_ideas (
  id uuid primary key default gen_random_uuid(),
  runsheet_id uuid not null references public.runsheets (id) on delete cascade,
  category text not null default 'other',
  text text not null,
  note text,
  -- Free-text place string used to build a Google Maps *search* link. Deliberately a
  -- search rather than a pinned place id: several of these names are uncertain.
  place text,
  image_url text,
  unconfirmed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists trip_ideas_runsheet_id_idx on public.trip_ideas (runsheet_id);

alter table public.trip_ideas enable row level security;

drop policy if exists "trip_ideas_select_access" on public.trip_ideas;
create policy "trip_ideas_select_access"
  on public.trip_ideas for select
  using (public.user_can_access_runsheet(runsheet_id));

drop policy if exists "trip_ideas_insert_editor" on public.trip_ideas;
create policy "trip_ideas_insert_editor"
  on public.trip_ideas for insert
  with check (
    public.user_can_access_runsheet(runsheet_id)
    and (
      public.user_owns_runsheet(runsheet_id)
      or exists (
        select 1 from public.runsheet_members m
        where m.runsheet_id = trip_ideas.runsheet_id
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
    )
  );

drop policy if exists "trip_ideas_update_editor" on public.trip_ideas;
create policy "trip_ideas_update_editor"
  on public.trip_ideas for update
  using (
    public.user_can_access_runsheet(runsheet_id)
    and (
      public.user_owns_runsheet(runsheet_id)
      or exists (
        select 1 from public.runsheet_members m
        where m.runsheet_id = trip_ideas.runsheet_id
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
    )
  )
  with check (
    public.user_can_access_runsheet(runsheet_id)
    and (
      public.user_owns_runsheet(runsheet_id)
      or exists (
        select 1 from public.runsheet_members m
        where m.runsheet_id = trip_ideas.runsheet_id
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
    )
  );

drop policy if exists "trip_ideas_delete_editor" on public.trip_ideas;
create policy "trip_ideas_delete_editor"
  on public.trip_ideas for delete
  using (
    public.user_can_access_runsheet(runsheet_id)
    and (
      public.user_owns_runsheet(runsheet_id)
      or exists (
        select 1 from public.runsheet_members m
        where m.runsheet_id = trip_ideas.runsheet_id
          and m.user_id = (select auth.uid())
          and m.role in ('owner', 'editor')
      )
    )
  );
