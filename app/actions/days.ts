"use server";

import { createClient } from "@/lib/supabase/server";
import type { RunsheetDb } from "@/lib/supabase/db-client";
import { upsertRunsheetDays } from "@/lib/runsheet-days";

export async function ensureRunsheetDays(
  runsheetId: string,
  dayDates: string[],
  client?: RunsheetDb,
) {
  const supabase = client ?? (await createClient());
  await upsertRunsheetDays(supabase, runsheetId, dayDates);
}
