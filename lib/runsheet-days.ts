import type { RunsheetDb } from "@/lib/supabase/db-client";

export async function upsertRunsheetDays(
  supabase: RunsheetDb,
  runsheetId: string,
  dayDates: string[],
) {
  const rows = dayDates.map((day_date) => ({ runsheet_id: runsheetId, day_date }));
  if (rows.length === 0) return;
  await supabase.from("runsheet_days").upsert(rows, {
    onConflict: "runsheet_id,day_date",
  });
}
