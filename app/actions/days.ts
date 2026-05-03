"use server";

import { createClient } from "@/lib/supabase/server";

export async function ensureRunsheetDays(runsheetId: string, dayDates: string[]) {
  const supabase = await createClient();
  const rows = dayDates.map((day_date) => ({ runsheet_id: runsheetId, day_date }));
  if (rows.length === 0) return;
  await supabase.from("runsheet_days").upsert(rows, {
    onConflict: "runsheet_id,day_date",
  });
}
