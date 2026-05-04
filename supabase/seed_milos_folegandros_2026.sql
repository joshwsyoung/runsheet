-- Milos & Folegandros May 2026 — full itinerary from trip runsheet PDF.
-- Timezone on runsheet: Europe/London (UK prep & return); Greek segments use Europe/Athens on each slot where noted so flight/ferry times match the PDF.
--
-- BEFORE YOU RUN:
-- 1. Supabase Dashboard → Authentication → Users → copy your user UUID.
-- 2. In the DECLARE block below, replace 00000000-0000-0000-0000-000000000001
--    with that UUID (keep the ::uuid cast).
-- 3. Paste the whole file into SQL Editor and run once. Creates one runsheet
--    with days May 19–30 2026, all slots from the PDF, and the house checklist on 21 May.

DO $$
DECLARE
  v_owner uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_rs uuid;
BEGIN
  IF v_owner = '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'Replace v_owner with your auth.users UUID (see comment at top of this file)';
  END IF;

  INSERT INTO public.runsheets (title, owner_id, timezone)
  VALUES ('Milos & Folegandros 2026', v_owner, 'Europe/London')
  RETURNING id INTO v_rs;

  INSERT INTO public.runsheet_days (runsheet_id, day_date, label, is_special)
  SELECT v_rs, d::date, lbl, false
  FROM (VALUES
    ('2026-05-19'::date, 'Tue · Home'),
    ('2026-05-20'::date, 'Wed · Home'),
    ('2026-05-21'::date, 'Thu · Home → Travel'),
    ('2026-05-22'::date, 'Fri · Travel → Milos Cove'),
    ('2026-05-23'::date, 'Sat · Milos Cove'),
    ('2026-05-24'::date, 'Sun · Milos Cove'),
    ('2026-05-25'::date, 'Mon · Milos Cove'),
    ('2026-05-26'::date, 'Tue · Milos Cove → Gundari, Folegandros'),
    ('2026-05-27'::date, 'Wed · Gundari, Folegandros'),
    ('2026-05-28'::date, 'Thu · Gundari, Folegandros'),
    ('2026-05-29'::date, 'Fri · Gundari → Santorini'),
    ('2026-05-30'::date, 'Sat · Santorini → Home')
  ) AS t(d, lbl);

  INSERT INTO public.slots (day_id, start_at, end_at, activity_type, title, description, description_bullets, booking_ref, contact_info, open_ended, sort_order)
  SELECT d.id, x.start_at, x.end_at, x.activity_type, x.title, x.description, x.bullets::jsonb, x.booking_ref, x.contact_info, x.open_ended, x.ord
  FROM (
    SELECT '2026-05-19'::date AS day_date, (timestamp '2026-05-19 09:00:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-19 17:00:00' AT TIME ZONE 'Europe/London') AS end_at, 'other'::text AS activity_type, 'Home'::text AS title, 'Milos & Folegandros trip – pre-travel week'::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 0 AS ord
    UNION ALL
    SELECT '2026-05-20'::date AS day_date, (timestamp '2026-05-20 09:00:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-20 17:00:00' AT TIME ZONE 'Europe/London') AS end_at, 'other'::text AS activity_type, 'Home – travel admin'::text AS title, NULL::text AS description, '["Check-in to Heathrow → Athens flights (Josh)","Check-in online (Aegean)","Add Freya''s flight arrival details (plane)","Add Freya''s arrive home details (taxi)"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 1 AS ord
    UNION ALL
    SELECT '2026-05-21'::date AS day_date, (timestamp '2026-05-21 08:00:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-21 09:00:00' AT TIME ZONE 'Europe/London') AS end_at, 'other'::text AS activity_type, 'Wake up & work'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 2 AS ord
    UNION ALL
    SELECT '2026-05-21'::date AS day_date, (timestamp '2026-05-21 09:00:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-21 17:00:00' AT TIME ZONE 'Europe/London') AS end_at, 'other'::text AS activity_type, 'Full day at work'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 3 AS ord
    UNION ALL
    SELECT '2026-05-21'::date AS day_date, (timestamp '2026-05-21 17:00:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-21 19:00:00' AT TIME ZONE 'Europe/London') AS end_at, 'other'::text AS activity_type, 'Prep to leave Honeypots'::text AS title, NULL::text AS description, '["Dinner / closedown checklist / brush teeth"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 4 AS ord
    UNION ALL
    SELECT '2026-05-21'::date AS day_date, (timestamp '2026-05-21 19:00:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-21 19:30:00' AT TIME ZONE 'Europe/London') AS end_at, 'taxi'::text AS activity_type, 'Travel to Heathrow (~30 mins)'::text AS title, NULL::text AS description, '["Taxi booking ref: TO BE BOOKED / UBER"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 5 AS ord
    UNION ALL
    SELECT '2026-05-21'::date AS day_date, (timestamp '2026-05-21 19:30:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-21 21:45:00' AT TIME ZONE 'Europe/London') AS end_at, 'other'::text AS activity_type, 'Waiting London Heathrow (~2h 15m before take-off)'::text AS title, NULL::text AS description, '["Check-in, security, duty free and lounge"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 6 AS ord
    UNION ALL
    SELECT '2026-05-21'::date AS day_date, (timestamp '2026-05-21 21:45:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-21 22:15:00' AT TIME ZONE 'Europe/London') AS end_at, 'flight'::text AS activity_type, 'Board flight (~30 mins before departure)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 7 AS ord
    UNION ALL
    SELECT '2026-05-21'::date AS day_date, (timestamp '2026-05-21 22:15:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-22 03:50:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'flight'::text AS activity_type, 'Flight Heathrow → Athens'::text AS title, 'Aegean Airlines A3609 · ~3h 35m'::text AS description, '["Booking ref: 7G9BMN","Seats: Freya 23F · Josh 23E","Check-in online"]'::jsonb AS bullets, '7G9BMN'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 8 AS ord
    UNION ALL
    SELECT '2026-05-22'::date AS day_date, (timestamp '2026-05-22 03:50:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-22 07:20:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Layover in Athens (~3h)'::text AS title, NULL::text AS description, '["Lounge / chill out place"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 9 AS ord
    UNION ALL
    SELECT '2026-05-22'::date AS day_date, (timestamp '2026-05-22 07:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-22 07:20:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'flight'::text AS activity_type, 'Board flight (~20 min before departure)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 10 AS ord
    UNION ALL
    SELECT '2026-05-22'::date AS day_date, (timestamp '2026-05-22 07:20:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-22 08:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'flight'::text AS activity_type, 'Flight Athens → Milos (~40 mins)'::text AS title, NULL::text AS description, '["Aegean A37020","Booking ref: 7G9BMN","Check-in online"]'::jsonb AS bullets, '7G9BMN'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 11 AS ord
    UNION ALL
    SELECT '2026-05-22'::date AS day_date, (timestamp '2026-05-22 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-22 08:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'rental_car'::text AS activity_type, 'Collect hire car – Avance Rental'::text AS title, NULL::text AS description, '["Collection at airport terminal · 08:00","Josh named driver · 119 EUR paid · no waiver","Check-in online"]'::jsonb AS bullets, '4HQB8D'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 12 AS ord
    UNION ALL
    SELECT '2026-05-22'::date AS day_date, (timestamp '2026-05-22 08:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-22 09:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'driving'::text AS activity_type, 'Drive to Milos Cove Hotel (~17 mins)'::text AS title, NULL::text AS description, '["Google Maps · Agkali Beach, Komia, 84800 Greece"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 13 AS ord
    UNION ALL
    SELECT '2026-05-22'::date AS day_date, (timestamp '2026-05-22 09:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-22 15:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'hotel_checkin'::text AS activity_type, 'Arrive Milos Cove Hotel'::text AS title, NULL::text AS description, '["Conf. 6133702505 · door PIN 4285 · Tel +30 695 185 2251","Check-in from 15:00 (early check-in requested by email)"]'::jsonb AS bullets, '6133702505'::text AS booking_ref, '+30 695 185 2251'::text AS contact_info, false::boolean AS open_ended, 14 AS ord
    UNION ALL
    SELECT '2026-05-22'::date AS day_date, (timestamp '2026-05-22 15:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-22 21:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Afternoon on Milos'::text AS title, NULL::text AS description, '["Activity for the afternoon?","Dinner at hotel?"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 15 AS ord
    UNION ALL
    SELECT '2026-05-23'::date AS day_date, (timestamp '2026-05-23 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-23 10:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'breakfast'::text AS activity_type, 'Wake up & breakfast – Milos Cove'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 16 AS ord
    UNION ALL
    SELECT '2026-05-23'::date AS day_date, (timestamp '2026-05-23 10:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-23 18:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Milos Cove – explore / beach / boat'::text AS title, NULL::text AS description, '["Plan your day on Milos"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 17 AS ord
    UNION ALL
    SELECT '2026-05-23'::date AS day_date, (timestamp '2026-05-23 19:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-23 21:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'dinner'::text AS activity_type, 'Dinner (hotel or out)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 18 AS ord
    UNION ALL
    SELECT '2026-05-24'::date AS day_date, (timestamp '2026-05-24 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-24 10:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'breakfast'::text AS activity_type, 'Wake up & breakfast – Milos Cove'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 19 AS ord
    UNION ALL
    SELECT '2026-05-24'::date AS day_date, (timestamp '2026-05-24 10:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-24 18:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Milos Cove – explore / beach / boat'::text AS title, NULL::text AS description, '["Plan your day on Milos"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 20 AS ord
    UNION ALL
    SELECT '2026-05-24'::date AS day_date, (timestamp '2026-05-24 19:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-24 21:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'dinner'::text AS activity_type, 'Dinner (hotel or out)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 21 AS ord
    UNION ALL
    SELECT '2026-05-25'::date AS day_date, (timestamp '2026-05-25 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-25 10:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'breakfast'::text AS activity_type, 'Wake up & breakfast – Milos Cove'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 22 AS ord
    UNION ALL
    SELECT '2026-05-25'::date AS day_date, (timestamp '2026-05-25 10:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-25 18:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Milos Cove – explore / beach / boat'::text AS title, NULL::text AS description, '["Plan your day on Milos"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 23 AS ord
    UNION ALL
    SELECT '2026-05-25'::date AS day_date, (timestamp '2026-05-25 19:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-25 21:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'dinner'::text AS activity_type, 'Dinner (hotel or out)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 24 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 10:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Wake up, breakfast and pack'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 25 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 10:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 10:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Ferry check-in (FerryScanner)'::text AS title, NULL::text AS description, '["Check-in opens 2h early"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 26 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 10:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 11:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'hotel_checkin'::text AS activity_type, 'Check out of Milos Cove Hotel'::text AS title, NULL::text AS description, '["Until 11:00"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 27 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 11:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 11:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'driving'::text AS activity_type, 'Drive to Milos port (~21 mins)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 28 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 11:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 12:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'rental_car'::text AS activity_type, 'Drop rental car – Avance at port'::text AS title, NULL::text AS description, '["Ref. 4HQB8D · drop location Avance at port · drop time ~12:30"]'::jsonb AS bullets, '4HQB8D'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 29 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 12:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 12:35:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Wait at Milos port (~35 mins)'::text AS title, NULL::text AS description, '["Café at port if you want"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 30 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 12:35:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 13:25:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'boat'::text AS activity_type, 'Ferry Milos → Folegandros (~1h 20m)'::text AS title, NULL::text AS description, '["Depart 12:35","Check-in online"]'::jsonb AS bullets, 'B144003749'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 31 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 13:25:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 13:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Arrive Folegandros port'::text AS title, NULL::text AS description, '["Disembark · meet Gundari shuttle driver"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 32 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 13:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 13:45:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'taxi'::text AS activity_type, 'Shuttle to Gundari Resort (~12 mins)'::text AS title, NULL::text AS description, '["Booked with Gundari · pickup from port ~13:30"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 33 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 13:45:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 15:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'hotel_checkin'::text AS activity_type, 'Gundari Resort – check-in'::text AS title, NULL::text AS description, '["Conf. 5663963304 · PIN 2815","Check-in from 15:00"]'::jsonb AS bullets, '5663963304'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 34 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 14:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 15:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'rental_car'::text AS activity_type, 'Collect hire car – FolegandrosRentACar at Gundari'::text AS title, NULL::text AS description, '["Ref. 882 · deposit 27 EUR paid · balance 63 EUR","Note: PDF mentions collection at Gundari – confirm time with desk"]'::jsonb AS bullets, '882'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 35 AS ord
    UNION ALL
    SELECT '2026-05-26'::date AS day_date, (timestamp '2026-05-26 15:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-26 21:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Afternoon on Folegandros'::text AS title, NULL::text AS description, '["Ideas: Lucy Williams (Instagram) · Condé Nast Travel","Dinner at hotel?"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 36 AS ord
    UNION ALL
    SELECT '2026-05-27'::date AS day_date, (timestamp '2026-05-27 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-27 10:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'breakfast'::text AS activity_type, 'Gundari – breakfast'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 37 AS ord
    UNION ALL
    SELECT '2026-05-27'::date AS day_date, (timestamp '2026-05-27 10:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-27 19:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Gundari – Folegandros free day'::text AS title, NULL::text AS description, '["Explore Chora · beaches · relax"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 38 AS ord
    UNION ALL
    SELECT '2026-05-28'::date AS day_date, (timestamp '2026-05-28 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-28 10:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'breakfast'::text AS activity_type, 'Gundari – breakfast'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 39 AS ord
    UNION ALL
    SELECT '2026-05-28'::date AS day_date, (timestamp '2026-05-28 10:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-28 19:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Gundari – Folegandros free day'::text AS title, NULL::text AS description, '["Explore Chora · beaches · relax"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 40 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 11:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Wake up, breakfast and pack'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 41 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 11:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 12:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Ferry check-in (FerryScanner)'::text AS title, NULL::text AS description, '["Opens 2h early"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 42 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 11:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 11:45:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Check-in to flight home (online)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 43 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 12:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 12:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'rental_car'::text AS activity_type, 'Drop rental car with Gundari Resort'::text AS title, NULL::text AS description, '["Rental ends 12:30"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 44 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 12:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 12:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'hotel_checkin'::text AS activity_type, 'Check out of Gundari Resort'::text AS title, NULL::text AS description, '["Until 12:00"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 45 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 12:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 12:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'taxi'::text AS activity_type, 'Shuttle to Folegandros port (Gundari)'::text AS title, NULL::text AS description, '["Confirm time with Gundari front desk"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 46 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 12:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 12:55:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Wait at Folegandros port'::text AS title, NULL::text AS description, '["Find a nice coffee shop"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 47 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 12:55:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 14:15:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'boat'::text AS activity_type, 'Ferry Folegandros → Santorini (~1h 20m)'::text AS title, NULL::text AS description, '["Depart 12:55","Check-in online"]'::jsonb AS bullets, 'B144003866'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 48 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 14:15:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 14:45:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Arrive Santorini port'::text AS title, NULL::text AS description, '["Disembark · meet taxi driver"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 49 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 14:45:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 15:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'taxi'::text AS activity_type, 'Taxi to Aqua Luxury Suites (~15 mins)'::text AS title, NULL::text AS description, '["Booking # – ask hotel","Tel – ask hotel","Google Maps link"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 50 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 15:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 16:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'hotel_checkin'::text AS activity_type, 'Aqua Luxury Suites – check-in & drop bags'::text AS title, NULL::text AS description, '["Ref. 5452988743 · check-in from 15:00"]'::jsonb AS bullets, '5452988743'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 51 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 16:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 18:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'activity'::text AS activity_type, 'Afternoon / evening on Santorini'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 52 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 19:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 21:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'dinner'::text AS activity_type, 'Dinner at BLU Restaurant (~2h)'::text AS title, NULL::text AS description, '["Booking under Josh Young · 19:30"]'::jsonb AS bullets, 'BLU 19:30'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 53 AS ord
    UNION ALL
    SELECT '2026-05-29'::date AS day_date, (timestamp '2026-05-29 21:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-29 23:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Home and rest'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, true::boolean AS open_ended, 54 AS ord
    UNION ALL
    SELECT '2026-05-30'::date AS day_date, (timestamp '2026-05-30 08:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-30 11:00:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Wake up and check out of Aqua'::text AS title, NULL::text AS description, '["Check out of Aqua"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 55 AS ord
    UNION ALL
    SELECT '2026-05-30'::date AS day_date, (timestamp '2026-05-30 11:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-30 11:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'taxi'::text AS activity_type, 'Taxi to Santorini Airport (~15 mins)'::text AS title, NULL::text AS description, '["Booking # – ask hotel","Tel – ask hotel"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 56 AS ord
    UNION ALL
    SELECT '2026-05-30'::date AS day_date, (timestamp '2026-05-30 14:00:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-30 15:30:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'other'::text AS activity_type, 'Santorini Airport – wait before flight'::text AS title, NULL::text AS description, '["~1h 55m before take-off"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 57 AS ord
    UNION ALL
    SELECT '2026-05-30'::date AS day_date, (timestamp '2026-05-30 15:30:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-30 15:55:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'flight'::text AS activity_type, 'Board flight (~25 mins before departure)'::text AS title, NULL::text AS description, '[]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 58 AS ord
    UNION ALL
    SELECT '2026-05-30'::date AS day_date, (timestamp '2026-05-30 15:55:00' AT TIME ZONE 'Europe/Athens') AS start_at, (timestamp '2026-05-30 18:05:00' AT TIME ZONE 'Europe/Athens') AS end_at, 'flight'::text AS activity_type, 'Santorini → London Heathrow (~4h 10m)'::text AS title, NULL::text AS description, '["BA691","Booking ref: X9NIYR"]'::jsonb AS bullets, 'X9NIYR'::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 59 AS ord
    UNION ALL
    SELECT '2026-05-30'::date AS day_date, (timestamp '2026-05-30 18:30:00' AT TIME ZONE 'Europe/London') AS start_at, (timestamp '2026-05-30 19:00:00' AT TIME ZONE 'Europe/London') AS end_at, 'taxi'::text AS activity_type, 'Taxi Heathrow → Honeypots'::text AS title, NULL::text AS description, '["Taxi booking ref: TO BE BOOKED / UBER"]'::jsonb AS bullets, NULL::text AS booking_ref, NULL::text AS contact_info, false::boolean AS open_ended, 60 AS ord
  ) AS x(day_date, start_at, end_at, activity_type, title, description, bullets, booking_ref, contact_info, open_ended, ord)
  JOIN public.runsheet_days d ON d.runsheet_id = v_rs AND d.day_date = x.day_date;

  INSERT INTO public.checklist_items (day_id, label, done, sort_order)
  SELECT d.id, c.label, false, c.ord
  FROM public.runsheet_days d
  CROSS JOIN (
    SELECT 'Water plants / garden' AS label, 0 AS ord
    UNION ALL
    SELECT 'Heating / hot water on adjusted settings' AS label, 1 AS ord
    UNION ALL
    SELECT 'Lock all windows' AS label, 2 AS ord
    UNION ALL
    SELECT 'Lock doors' AS label, 3 AS ord
    UNION ALL
    SELECT 'Padlock side gate' AS label, 4 AS ord
    UNION ALL
    SELECT 'Pin through main gates (optional)' AS label, 5 AS ord
    UNION ALL
    SELECT 'Arm security cameras' AS label, 6 AS ord
    UNION ALL
    SELECT 'Bins out' AS label, 7 AS ord
    UNION ALL
    SELECT 'Bin collection day check' AS label, 8 AS ord
    UNION ALL
    SELECT 'Dishwasher on' AS label, 9 AS ord
    UNION ALL
    SELECT 'Check postbox' AS label, 10 AS ord
    UNION ALL
    SELECT 'Timer switches' AS label, 11 AS ord
    UNION ALL
    SELECT 'Appliances off' AS label, 12 AS ord
    UNION ALL
    SELECT 'Fridge perishable items check' AS label, 13 AS ord
    UNION ALL
    SELECT 'Lock garage' AS label, 14 AS ord
    UNION ALL
    SELECT 'Heating on holiday mode' AS label, 15 AS ord
    UNION ALL
    SELECT 'John and Aline notified' AS label, 16 AS ord
  ) AS c(label, ord)
  WHERE d.runsheet_id = v_rs AND d.day_date = '2026-05-21'::date;

  RAISE NOTICE 'Created runsheet %', v_rs;
END $$;

