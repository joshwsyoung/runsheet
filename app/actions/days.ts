"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RunsheetDb } from "@/lib/supabase/db-client";
import { upsertRunsheetDays } from "@/lib/runsheet-days";
import { nextDayStatus, normalizeDayStatus } from "@/lib/day-status";

export async function ensureRunsheetDays(
  runsheetId: string,
  dayDates: string[],
  client?: RunsheetDb,
) {
  const supabase = client ?? (await createClient());
  await upsertRunsheetDays(supabase, runsheetId, dayDates);
}

/**
 * Advance a day's status one step. The seeded work/leave pattern is a guess, so this
 * has to be a one-tap correction rather than a trip to a settings screen.
 */
export async function cycleDayStatus(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const dayId = String(formData.get("day_id") ?? "");
  const current = String(formData.get("current") ?? "");
  if (!runsheetId || !dayId) return;
  const supabase = await createClient();
  await supabase
    .from("runsheet_days")
    .update({ status: nextDayStatus(current) })
    .eq("id", dayId);
  revalidatePath(`/runsheet/${runsheetId}`);
}

export async function setDayStatus(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const dayId = String(formData.get("day_id") ?? "");
  const status = normalizeDayStatus(String(formData.get("status") ?? ""));
  if (!runsheetId || !dayId) return;
  const supabase = await createClient();
  await supabase.from("runsheet_days").update({ status }).eq("id", dayId);
  revalidatePath(`/runsheet/${runsheetId}`);
}
