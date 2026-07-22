-- Paros 2026 — Josh & Freya, Villa Thelma, 7–22 August 2026.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste this whole file → Run. Once.
--   It resolves the owner from auth.users by email (no UUID to paste in).
--   It refuses to run twice: delete the existing 'Paros 2026' runsheet first if you
--   want to re-seed, so this can never quietly overwrite edits you've made in the app.
--
-- PREREQUISITE
--   Run supabase/migrations/20260722100000_day_status_and_trip_ideas.sql first
--   (adds runsheet_days.status and the trip_ideas table).
--
-- TIMEZONE
--   The runsheet timezone is Europe/Athens, because 15 of the 16 days are in Greece
--   and you want Greek local time while you are there. That means the UK-side slots on
--   Fri 7 Aug are shown in Athens time (Athens = London + 2h in August). Every UK-side
--   slot says the London time explicitly in its description so there is no ambiguity.
--
-- SOURCES — flights, car hire and villa dates are from confirmation emails, not from
-- the planning voice note:
--   Kiwi.com booking 809 766 287 (confirmed 1 Jul 2026)
--   Booking.com / Thrifty car hire confirmation 743498981
--   Villa Thelma — calendar hold Fri 7 Aug – Sat 22 Aug 2026
-- Place names that came from the voice note are marked unconfirmed in trip_ideas.

DO $$
DECLARE
  v_owner uuid;
  v_rs uuid;
BEGIN
  SELECT id INTO v_owner FROM auth.users WHERE lower(email) = 'joshwsyoung@gmail.com';
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for joshwsyoung@gmail.com — sign up in the app first, or edit the email on this line.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.runsheets WHERE owner_id = v_owner AND title = 'Paros 2026') THEN
    RAISE EXCEPTION 'A runsheet called "Paros 2026" already exists. Delete it in the app first if you want to re-seed.';
  END IF;

  INSERT INTO public.runsheets (title, owner_id, timezone, start_date, end_date, hero_image_url)
  VALUES (
    'Paros 2026',
    v_owner,
    'Europe/Athens',
    '2026-08-07'::date,
    '2026-08-22'::date,
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=70'
  )
  RETURNING id INTO v_rs;

  -- -------------------------------------------------------------------------
  -- Days + work/leave pattern.
  --
  -- ASSUMPTION, NOT CONFIRMED: Josh said leave is booked "only on the last three
  -- days of each week", so Wed–Fri are marked leave and Mon/Tue as working days.
  -- No actual leave calendar was supplied. Tap the status dot on any day in the app
  -- to change it — nothing downstream depends on these values being right.
  -- -------------------------------------------------------------------------
  INSERT INTO public.runsheet_days (runsheet_id, day_date, label, status, is_special)
  SELECT v_rs, d, lbl, st, sp
  FROM (VALUES
    ('2026-08-07'::date, 'Fri · London → overnight flight', 'travel', true),
    ('2026-08-08'::date, 'Sat · Arrive Paros',              'travel', true),
    ('2026-08-09'::date, 'Sun · Villa Thelma',              'free',   false),
    ('2026-08-10'::date, 'Mon · Working',                   'work',   false),
    ('2026-08-11'::date, 'Tue · Working',                   'work',   false),
    ('2026-08-12'::date, 'Wed · On leave',                  'leave',  false),
    ('2026-08-13'::date, 'Thu · On leave',                  'leave',  false),
    ('2026-08-14'::date, 'Fri · On leave',                  'leave',  false),
    ('2026-08-15'::date, 'Sat · Weekend',                   'free',   false),
    ('2026-08-16'::date, 'Sun · Weekend',                   'free',   false),
    ('2026-08-17'::date, 'Mon · Working',                   'work',   false),
    ('2026-08-18'::date, 'Tue · Working',                   'work',   false),
    ('2026-08-19'::date, 'Wed · On leave',                  'leave',  false),
    ('2026-08-20'::date, 'Thu · On leave',                  'leave',  false),
    ('2026-08-21'::date, 'Fri · Last full day',             'leave',  false),
    ('2026-08-22'::date, 'Sat · Paros → London',            'travel', true)
  ) AS t(d, lbl, st, sp);

  -- -------------------------------------------------------------------------
  -- Slots. All wall times are Europe/Athens.
  --
  -- Working days (Mon/Tue) deliberately carry only three slots — breakfast, a work
  -- block, and an evening. Josh asked for the light days to be light by design.
  -- Leave days carry a single open-ended anchor rather than a packed plan, so the
  -- specifics can be pulled across from the ideas pool.
  -- -------------------------------------------------------------------------
  INSERT INTO public.slots (
    day_id, start_at, end_at, activity_type, title, description, description_bullets,
    todos, from_location, to_location, flight_number, location_name, map_url,
    booking_ref, contact_info, open_ended, sort_order
  )
  SELECT
    d.id,
    (x.starts AT TIME ZONE 'Europe/Athens'),
    (x.ends AT TIME ZONE 'Europe/Athens'),
    x.activity_type, x.title, x.description, x.bullets::jsonb, x.todos::jsonb,
    x.from_location, x.to_location, x.flight_number, x.location_name, x.map_url,
    x.booking_ref, x.contact_info, x.open_ended, x.ord
  FROM (VALUES
    -- ===================== Fri 7 Aug — travel out (UK side) =====================
    ('2026-08-07'::date, timestamp '2026-08-07 18:00', timestamp '2026-08-07 20:00', 'other', 'Finish work & final pack',
      '16:00–18:00 London time.',
      '["Passports, EHIC/GHIC, driving licence","Credit card in Josh''s name — Thrifty need it at the desk"]',
      '[{"id":"p1","text":"Print or download the Thrifty voucher","done":false},{"id":"p2","text":"Download e-tickets offline","done":false}]',
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 0),

    ('2026-08-07'::date, timestamp '2026-08-07 20:00', timestamp '2026-08-07 20:45', 'taxi', 'Home → Heathrow',
      '18:00–18:45 London time.', '[]', '[{"id":"t1","text":"Book the taxi","done":false}]',
      'Home', 'London Heathrow T2', NULL, NULL, NULL, NULL, NULL, false, 1),

    ('2026-08-07'::date, timestamp '2026-08-07 20:45', timestamp '2026-08-07 23:45', 'other', 'Heathrow — bag drop, security, dinner',
      '18:45–21:45 London time. Aegean departs from Terminal 2.',
      '["Two checked bags, 23kg each","Cabin: 55×40×23, 8kg each"]', '[]',
      NULL, NULL, NULL, 'London Heathrow Terminal 2', 'https://maps.google.com/?q=London+Heathrow+Terminal+2', NULL, NULL, false, 2),

    ('2026-08-07'::date, timestamp '2026-08-07 23:45', timestamp '2026-08-08 00:15', 'flight', 'Boarding — A3609',
      '21:45–22:15 London time. Gate closes 15 min before departure.', '[]', '[]',
      NULL, NULL, 'A3609', NULL, NULL, '809766287', NULL, false, 3),

    -- ===================== Sat 8 Aug — arrive Paros =====================
    ('2026-08-08'::date, timestamp '2026-08-08 00:15', timestamp '2026-08-08 03:50', 'flight', 'Flight — Heathrow → Athens',
      'Aegean A3609. Departs 22:15 London time on Fri 7th, lands 03:50 Athens. 3h 35m.',
      '["Seats 17A / 17B","Kiwi.com booking 809 766 287"]',
      '[{"id":"f1","text":"Online check-in (opens 24h before)","done":false}]',
      'London Heathrow (LHR)', 'Athens International (ATH)', 'A3609', NULL, NULL, '809766287', NULL, false, 4),

    ('2026-08-08'::date, timestamp '2026-08-08 03:50', timestamp '2026-08-08 06:00', 'other', 'Athens layover — SELF-TRANSFER',
      'Not a through-checked connection. You must collect both checked bags at Athens and re-check them with Olympic Air yourself. ~2h 10m to do it in.',
      '["Kiwi.com flagged this as a self-transfer itinerary","Baggage reclaim → Olympic Air desk → security again"]',
      '[{"id":"l1","text":"Collect checked bags","done":false},{"id":"l2","text":"Re-check bags with Olympic Air","done":false}]',
      NULL, NULL, NULL, 'Athens International Airport', 'https://maps.google.com/?q=Athens+International+Airport', '809766287', NULL, false, 5),

    ('2026-08-08'::date, timestamp '2026-08-08 06:00', timestamp '2026-08-08 06:40', 'flight', 'Flight — Athens → Paros',
      'A37060, operated by Olympic Air. 40m.', '["Kiwi.com booking 809 766 287"]', '[]',
      'Athens International (ATH)', 'Paros National (PAS)', 'A37060', NULL, NULL, '809766287', NULL, false, 6),

    ('2026-08-08'::date, timestamp '2026-08-08 06:40', timestamp '2026-08-08 07:15', 'rental_car', 'Collect hire car — Thrifty',
      'Kia Picanto or similar, manual, air con. Paros Airport Desk. Pick-up is booked for 06:30 but the flight lands 06:40 — flight number A37060 is on the booking so the desk should be expecting you.',
      '["Confirmation 743498981","Thrifty desk +30 2284 028113","Paid £1,158.15 inc. Zurich Full Protection"]',
      '[{"id":"c1","text":"Voucher (printed or on phone)","done":false},{"id":"c2","text":"Both driving licences","done":false},{"id":"c3","text":"Passport + credit card in Josh''s name","done":false}]',
      NULL, NULL, 'A37060', 'Paros Airport Desk, Paros 84400', 'https://maps.google.com/?q=Paros+National+Airport', '743498981', '+30 2284 028113', false, 7),

    ('2026-08-08'::date, timestamp '2026-08-08 07:15', timestamp '2026-08-08 07:45', 'driving', 'Drive to Villa Thelma',
      NULL, '[]', '[]',
      'Paros National Airport', 'Villa Thelma, Paros', NULL, 'Villa Thelma', 'https://maps.google.com/?q=Villa+Thelma+Paros', NULL, NULL, false, 8),

    ('2026-08-08'::date, timestamp '2026-08-08 08:00', timestamp '2026-08-08 09:30', 'breakfast', 'Breakfast — Aphrodite''s Bites',
      'Opposite the supermarket junction. The one fixed plan from the voice note: breakfast here on day one.',
      '[]', '[]',
      NULL, NULL, NULL, 'Aphrodite''s Bites, Paros', 'https://maps.google.com/?q=Aphrodite%27s+Bites+Paros', NULL, NULL, false, 9),

    ('2026-08-08'::date, timestamp '2026-08-08 09:30', timestamp '2026-08-08 15:00', 'other', 'Sleep off the night flight',
      'You will have been up all night. Nothing booked.', '[]', '[]',
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 10),

    ('2026-08-08'::date, timestamp '2026-08-08 15:00', timestamp '2026-08-08 16:00', 'hotel_checkin', 'Villa Thelma — settle in',
      'Managed by Penny; owner Rodel.', '["Penny — pennychristodoulou10@gmail.com"]',
      '[{"id":"v1","text":"Supermarket run — breakfast things, water, coffee","done":false}]',
      NULL, NULL, NULL, 'Villa Thelma, Paros', 'https://maps.google.com/?q=Villa+Thelma+Paros', NULL, NULL, false, 11),

    ('2026-08-08'::date, timestamp '2026-08-08 20:00', timestamp '2026-08-08 22:00', 'dinner', 'Dinner — keep it easy',
      'First night. Somewhere close.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 12),

    -- ===================== Sun 9 Aug — free =====================
    ('2026-08-09'::date, timestamp '2026-08-09 09:00', timestamp '2026-08-09 10:30', 'breakfast', 'Breakfast at the villa', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 13),
    ('2026-08-09'::date, timestamp '2026-08-09 11:00', timestamp '2026-08-09 18:00', 'activity', 'Beach day — Kolymbithres',
      'Steep steps down to the beach. You had a massage here last time.', '[]', '[]',
      NULL, NULL, NULL, 'Kolymbithres Beach, Paros', 'https://maps.google.com/?q=Kolymbithres+Beach+Paros', NULL, NULL, true, 14),
    ('2026-08-09'::date, timestamp '2026-08-09 20:30', timestamp '2026-08-09 22:30', 'dinner', 'Dinner out', 'Pull one across from Ideas.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 15),

    -- ===================== Mon 10 Aug — working =====================
    ('2026-08-10'::date, timestamp '2026-08-10 08:30', timestamp '2026-08-10 09:30', 'breakfast', 'Breakfast at the villa', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 16),
    ('2026-08-10'::date, timestamp '2026-08-10 10:00', timestamp '2026-08-10 19:00', 'other', 'Working day',
      'London hours are 08:00–17:00 UK = 10:00–19:00 here. Nothing scheduled on purpose.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 17),
    ('2026-08-10'::date, timestamp '2026-08-10 19:30', timestamp '2026-08-10 22:00', 'dinner', 'Swim, then dinner', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 18),

    -- ===================== Tue 11 Aug — working =====================
    ('2026-08-11'::date, timestamp '2026-08-11 08:30', timestamp '2026-08-11 09:30', 'breakfast', 'Breakfast at the villa', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 19),
    ('2026-08-11'::date, timestamp '2026-08-11 10:00', timestamp '2026-08-11 19:00', 'other', 'Working day', 'Kept clear.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 20),
    ('2026-08-11'::date, timestamp '2026-08-11 19:30', timestamp '2026-08-11 22:00', 'dinner', 'Swim, then dinner', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 21),

    -- ===================== Wed 12 Aug — leave =====================
    ('2026-08-12'::date, timestamp '2026-08-12 09:00', timestamp '2026-08-12 10:30', 'breakfast', 'Breakfast out', 'First proper day off — try one of the breakfast places from Ideas.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 22),
    ('2026-08-12'::date, timestamp '2026-08-12 11:00', timestamp '2026-08-12 19:00', 'activity', 'Beach day — Santa Maria', NULL, '[]', '[]',
      NULL, NULL, NULL, 'Santa Maria Beach, Paros', 'https://maps.google.com/?q=Santa+Maria+Beach+Paros', NULL, NULL, true, 23),
    ('2026-08-12'::date, timestamp '2026-08-12 20:30', timestamp '2026-08-12 23:00', 'dinner', 'Dinner out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 24),

    -- ===================== Thu 13 Aug — leave — Naxos =====================
    ('2026-08-13'::date, timestamp '2026-08-13 08:00', timestamp '2026-08-13 09:00', 'breakfast', 'Early breakfast', 'Ferry day.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 25),
    ('2026-08-13'::date, timestamp '2026-08-13 09:00', timestamp '2026-08-13 10:00', 'boat', 'Ferry — Parikia → Naxos',
      'NOT BOOKED. Parikia–Naxos runs frequently in August; book once dates are firm.', '[]',
      '[{"id":"n1","text":"Book the Naxos ferry both ways","done":false}]',
      'Parikia, Paros', 'Naxos', NULL, 'Parikia Port', 'https://maps.google.com/?q=Parikia+Port+Paros', NULL, NULL, false, 26),
    ('2026-08-13'::date, timestamp '2026-08-13 10:00', timestamp '2026-08-13 20:00', 'activity', 'Naxos for the day',
      'Yamini for lunch (courtyard, arched door, good pasta) is the one you both remembered clearly. Alyko is on Naxos too.', '[]', '[]',
      NULL, NULL, NULL, 'Naxos', 'https://maps.google.com/?q=Naxos+Greece', NULL, NULL, true, 27),
    ('2026-08-13'::date, timestamp '2026-08-13 20:30', timestamp '2026-08-13 21:30', 'boat', 'Ferry — Naxos → Parikia', 'NOT BOOKED.', '[]', '[]',
      'Naxos', 'Parikia, Paros', NULL, NULL, NULL, NULL, NULL, false, 28),

    -- ===================== Fri 14 Aug — leave =====================
    ('2026-08-14'::date, timestamp '2026-08-14 09:30', timestamp '2026-08-14 11:00', 'breakfast', 'Breakfast out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 29),
    ('2026-08-14'::date, timestamp '2026-08-14 11:30', timestamp '2026-08-14 16:00', 'activity', 'Parikia — shopping & wander', NULL, '[]', '[]',
      NULL, NULL, NULL, 'Parikia, Paros', 'https://maps.google.com/?q=Parikia+Paros', NULL, NULL, true, 30),
    ('2026-08-14'::date, timestamp '2026-08-14 20:00', timestamp '2026-08-14 23:30', 'dinner', 'Dinner, then drinks', 'Barbarossa or The Avant.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 31),

    -- ===================== Sat 15 / Sun 16 Aug — weekend =====================
    ('2026-08-15'::date, timestamp '2026-08-15 09:30', timestamp '2026-08-15 11:00', 'breakfast', 'Breakfast at the villa', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 32),
    ('2026-08-15'::date, timestamp '2026-08-15 11:30', timestamp '2026-08-15 19:00', 'activity', 'Beach day', 'Open — pick one from Ideas.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 33),
    ('2026-08-15'::date, timestamp '2026-08-15 20:30', timestamp '2026-08-15 23:00', 'dinner', 'Dinner out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 34),

    ('2026-08-16'::date, timestamp '2026-08-16 09:30', timestamp '2026-08-16 11:00', 'breakfast', 'Breakfast at the villa', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 35),
    ('2026-08-16'::date, timestamp '2026-08-16 11:30', timestamp '2026-08-16 19:00', 'activity', 'Slow day at the villa', 'Halfway point — nothing planned.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 36),
    ('2026-08-16'::date, timestamp '2026-08-16 20:30', timestamp '2026-08-16 23:00', 'dinner', 'Dinner out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 37),

    -- ===================== Mon 17 / Tue 18 Aug — working =====================
    ('2026-08-17'::date, timestamp '2026-08-17 08:30', timestamp '2026-08-17 09:30', 'breakfast', 'Breakfast at the villa', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 38),
    ('2026-08-17'::date, timestamp '2026-08-17 10:00', timestamp '2026-08-17 19:00', 'other', 'Working day', 'Kept clear.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 39),
    ('2026-08-17'::date, timestamp '2026-08-17 19:30', timestamp '2026-08-17 22:00', 'dinner', 'Swim, then dinner', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 40),

    ('2026-08-18'::date, timestamp '2026-08-18 08:30', timestamp '2026-08-18 09:30', 'breakfast', 'Breakfast at the villa', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 41),
    ('2026-08-18'::date, timestamp '2026-08-18 10:00', timestamp '2026-08-18 19:00', 'other', 'Working day', 'Kept clear.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 42),
    ('2026-08-18'::date, timestamp '2026-08-18 19:30', timestamp '2026-08-18 22:00', 'dinner', 'Swim, then dinner', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 43),

    -- ===================== Wed 19 – Fri 21 Aug — leave =====================
    ('2026-08-19'::date, timestamp '2026-08-19 09:30', timestamp '2026-08-19 11:00', 'breakfast', 'Breakfast out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 44),
    ('2026-08-19'::date, timestamp '2026-08-19 11:30', timestamp '2026-08-19 19:00', 'activity', 'Beach day', 'Open — pick one from Ideas.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 45),
    ('2026-08-19'::date, timestamp '2026-08-19 20:30', timestamp '2026-08-19 23:00', 'dinner', 'Dinner out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 46),

    ('2026-08-20'::date, timestamp '2026-08-20 09:30', timestamp '2026-08-20 11:00', 'breakfast', 'Breakfast out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 47),
    ('2026-08-20'::date, timestamp '2026-08-20 11:30', timestamp '2026-08-20 19:00', 'activity', 'Something active',
      'Horse riding and tennis are both on the list and both need booking ahead.', '[]',
      '[{"id":"a1","text":"Ring ahead for horse riding or tennis","done":false}]',
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 48),
    ('2026-08-20'::date, timestamp '2026-08-20 20:30', timestamp '2026-08-20 23:00', 'dinner', 'Dinner out', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 49),

    ('2026-08-21'::date, timestamp '2026-08-21 09:30', timestamp '2026-08-21 11:00', 'breakfast', 'Breakfast out', 'Last one.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 50),
    ('2026-08-21'::date, timestamp '2026-08-21 11:30', timestamp '2026-08-21 18:00', 'activity', 'Favourite beach, one more time', NULL, '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 51),
    ('2026-08-21'::date, timestamp '2026-08-21 18:00', timestamp '2026-08-21 20:00', 'other', 'Pack + tidy the villa',
      'Early start tomorrow — car drops at 06:00.', '[]',
      '[{"id":"z1","text":"Fuel the hire car","done":false},{"id":"z2","text":"Online check-in for A37059 / A3600","done":false},{"id":"z3","text":"Set an alarm for 04:30","done":false}]',
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 52),
    ('2026-08-21'::date, timestamp '2026-08-21 20:30', timestamp '2026-08-21 23:00', 'dinner', 'Last dinner', 'The Avant, if you have not been yet.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 53),

    -- ===================== Sat 22 Aug — home =====================
    ('2026-08-22'::date, timestamp '2026-08-22 04:30', timestamp '2026-08-22 05:15', 'other', 'Up, last check of the villa', 'Brutal, sorry.', '[]', '[]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, 54),
    ('2026-08-22'::date, timestamp '2026-08-22 05:15', timestamp '2026-08-22 05:45', 'driving', 'Drive to Paros airport', NULL, '[]', '[]',
      'Villa Thelma, Paros', 'Paros National Airport', NULL, NULL, 'https://maps.google.com/?q=Paros+National+Airport', NULL, NULL, false, 55),
    ('2026-08-22'::date, timestamp '2026-08-22 05:45', timestamp '2026-08-22 06:00', 'rental_car', 'Drop the hire car — Thrifty',
      'Drop-off booked for 06:00 at the Paros Airport desk.', '["Confirmation 743498981"]',
      '[{"id":"d1","text":"Photograph the car before handing back","done":false}]',
      NULL, NULL, NULL, 'Paros Airport Desk', 'https://maps.google.com/?q=Paros+National+Airport', '743498981', '+30 2284 028113', false, 56),
    ('2026-08-22'::date, timestamp '2026-08-22 06:30', timestamp '2026-08-22 07:10', 'flight', 'Flight — Paros → Athens',
      'A37059, operated by Olympic Air. 40m.', '["Kiwi.com booking 809 766 287"]', '[]',
      'Paros National (PAS)', 'Athens International (ATH)', 'A37059', NULL, NULL, '809766287', NULL, false, 57),
    ('2026-08-22'::date, timestamp '2026-08-22 07:10', timestamp '2026-08-22 09:15', 'other', 'Athens layover',
      'Same self-transfer booking as the way out — assume you collect and re-check the bags again unless Olympic Air tag them through to Heathrow.', '[]',
      '[{"id":"r1","text":"Ask at Paros check-in whether bags go through to LHR","done":false}]',
      NULL, NULL, NULL, 'Athens International Airport', 'https://maps.google.com/?q=Athens+International+Airport', '809766287', NULL, false, 58),
    ('2026-08-22'::date, timestamp '2026-08-22 09:15', timestamp '2026-08-22 12:15', 'flight', 'Flight — Athens → Heathrow',
      'Aegean A3600. Lands 11:15 London time. 4h.', '["Seats 18A / 18B","Kiwi.com booking 809 766 287"]', '[]',
      'Athens International (ATH)', 'London Heathrow (LHR)', 'A3600', NULL, NULL, '809766287', NULL, false, 59),
    ('2026-08-22'::date, timestamp '2026-08-22 12:15', timestamp '2026-08-22 14:00', 'taxi', 'Heathrow → home',
      '11:15–12:00 London time, plus baggage reclaim.', '[]', '[{"id":"h1","text":"Book the taxi home","done":false}]',
      'London Heathrow', 'Home', NULL, NULL, NULL, NULL, NULL, true, 60)
  ) AS x(day_date, starts, ends, activity_type, title, description, bullets, todos,
         from_location, to_location, flight_number, location_name, map_url,
         booking_ref, contact_info, open_ended, ord)
  JOIN public.runsheet_days d
    ON d.runsheet_id = v_rs AND d.day_date = x.day_date;

  -- -------------------------------------------------------------------------
  -- Ideas pool — everything from the planning voice note that has no day yet.
  --
  -- `unconfirmed = true` means the name itself was unclear on the recording. These
  -- are shown with an "unconfirmed" badge in the app rather than being cleaned up
  -- into something that sounds more certain than it is.
  -- -------------------------------------------------------------------------
  INSERT INTO public.trip_ideas (runsheet_id, category, text, note, place, unconfirmed, sort_order)
  SELECT v_rs, category, text, note, place, unconfirmed, ord
  FROM (VALUES
    ('breakfast', 'The smoothie place with corner seating', 'Name was not audible on the recording.', 'smoothie cafe Paros', true, 0),
    ('breakfast', 'Breakfast place near a church', 'Sana''s recommendation — she and her sister took you once. Vietnamese noodles came up in the same breath, which may or may not be the same place.', 'breakfast near church Paros', true, 1),

    ('restaurant', 'Siggy''s', 'Paros.', 'Siggy''s Paros', false, 2),
    ('restaurant', 'Stilvi', 'Paros.', 'Stilvi Paros', false, 3),
    ('restaurant', 'Kanali', 'They have two now — unclear which location was meant.', 'Kanali Paros', true, 4),
    ('restaurant', 'Yamini', 'Naxos. Courtyard, arched door entrance, excellent pasta.', 'Yamini Naxos', false, 5),
    ('restaurant', 'The fancy one on the harbour front', 'Naxos. You have been before but neither of you got the name.', 'harbour front restaurant Naxos', true, 6),
    ('restaurant', 'Beach place at Alyko', 'Rice paper wraps and Spanish-style octopus. Described as outstanding. Alyko is on Naxos, so pair it with the Naxos day.', 'Alyko beach restaurant Naxos', true, 7),

    ('bar', 'Barbarossa', NULL, 'Barbarossa Paros', false, 8),
    ('bar', 'The Avant', 'Cocktails, possibly dinner too.', 'The Avant Paros', false, 9),

    ('beach', 'Kolymbithres', 'Steep steps down. You had a massage here last time.', 'Kolymbithres Beach Paros', false, 10),
    ('beach', 'Santa Maria', NULL, 'Santa Maria Beach Paros', false, 11),
    ('beach', 'Small beach below the headland', 'Near "the rooster" taverna — that name is a guess at what was said.', 'beach near taverna Paros', true, 12),
    ('beach', 'The beach by the "Parox" hotel', 'You dropped a pin on it. Hotel name uncertain — possibly Parocks or Parilio.', 'Parocks Hotel Paros beach', true, 13),

    ('activity', 'Horse riding', 'Needs booking ahead in August.', 'horse riding Paros', false, 14),
    ('activity', 'Tennis', NULL, 'tennis courts Paros', false, 15),
    ('activity', 'Shopping in Parikia', NULL, 'Parikia Paros', false, 16),
    ('activity', 'Diving', 'You said you were "not that fussed" — kept here rather than scheduled.', 'diving Paros', false, 17)
  ) AS i(category, text, note, place, unconfirmed, ord);

  RAISE NOTICE 'Paros 2026 seeded: runsheet %', v_rs;
END
$$;
