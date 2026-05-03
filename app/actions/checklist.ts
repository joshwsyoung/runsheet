"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleChecklistItem(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  if (!runsheetId || !itemId) return;
  const supabase = await createClient();
  await supabase.from("checklist_items").update({ done }).eq("id", itemId);
  revalidatePath(`/runsheet/${runsheetId}`);
}

export async function addChecklistItem(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const dayId = String(formData.get("day_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!runsheetId || !dayId || !label) return;
  const supabase = await createClient();
  await supabase.from("checklist_items").insert({ day_id: dayId, label });
  revalidatePath(`/runsheet/${runsheetId}`);
}
