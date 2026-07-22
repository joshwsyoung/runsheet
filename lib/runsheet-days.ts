import type { RunsheetDb } from "@/lib/supabase/db-client";

export async function upsertRunsheetDays(
  supabase: RunsheetDb,
  runsheetId: string,
  dayDates: string[],
) {
  if (dayDates.length === 0) return;
  const { data: existing } = await supabase
    .from("runsheet_days")
    .select("day_date")
    .eq("runsheet_id", runsheetId)
    .in("day_date", dayDates);
  const have = new Set((existing ?? []).map((r) => r.day_date));
  const missing = dayDates.filter((d) => !have.has(d));
  if (missing.length === 0) return;
  const rows = missing.map((day_date) => ({ runsheet_id: runsheetId, day_date }));
  await supabase.from("runsheet_days").upsert(rows, {
    onConflict: "runsheet_id,day_date",
  });
}
