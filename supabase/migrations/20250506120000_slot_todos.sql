-- Free-text prep items per slot (one string per line in the UI; stored as JSON array).

alter table public.slots
  add column if not exists todos jsonb not null default '[]'::jsonb;
