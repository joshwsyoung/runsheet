-- Resolved coordinates for a slot's places.
--
-- Free-text place names ("Heathrow T2") are ambiguous: geocoding them on every render
-- can land on a different candidate each time, or on none at all, which is why the map
-- sometimes fails to place a pin or draw a route. When someone picks a place from the
-- searchable From / To / Location fields we now pin the exact coordinates here. A
-- "lat,lng" query resolves to precisely one point in both Google's Embed API and the
-- Leaflet fallback, so a pin (and a route) is guaranteed. The text columns keep the
-- human-readable label; these just remove the ambiguity from the map.

alter table public.slots
  add column if not exists from_lat double precision,
  add column if not exists from_lng double precision,
  add column if not exists to_lat double precision,
  add column if not exists to_lng double precision,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;
