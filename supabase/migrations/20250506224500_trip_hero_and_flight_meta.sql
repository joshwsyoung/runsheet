alter table public.runsheets
  add column if not exists hero_image_url text;

alter table public.slots
  add column if not exists flight_meta jsonb,
  add column if not exists attachment_urls jsonb;

