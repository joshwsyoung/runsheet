-- Optional structured fields for transport/location-heavy activities.

alter table public.slots
  add column if not exists from_location text,
  add column if not exists to_location text,
  add column if not exists flight_number text,
  add column if not exists location_name text,
  add column if not exists map_url text;
