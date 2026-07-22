"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localWallRangeEndUtcIso, localWallToUtcIso } from "@/lib/dates";
import { mapsSearchUrl } from "@/lib/places";
import {
  defaultWindowForIdeaCategory,
  normalizeIdeaCategory,
  slotTypeForIdeaCategory,
} from "@/lib/trip-ideas";

function revalidateIdeas(runsheetId: string) {
  revalidatePath(`/runsheet/${runsheetId}/ideas`);
  revalidatePath(`/runsheet/${runsheetId}`);
}

export async function addIdea(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!runsheetId || !text) return;
  const category = normalizeIdeaCategory(String(formData.get("category") ?? ""));
  const place = String(formData.get("place") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const unconfirmed = String(formData.get("unconfirmed") ?? "") === "on";

  const supabase = await createClient();
  await supabase.from("trip_ideas").insert({
    runsheet_id: runsheetId,
    category,
    text,
    note: note || null,
    // Fall back to the idea's own name as the map search when no place is given.
    place: place || text,
    unconfirmed,
  });
  revalidateIdeas(runsheetId);
}

export async function deleteIdea(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const ideaId = String(formData.get("idea_id") ?? "");
  if (!runsheetId || !ideaId) return;
  const supabase = await createClient();
  await supabase.from("trip_ideas").delete().eq("id", ideaId);
  revalidateIdeas(runsheetId);
}

export async function toggleIdeaUnconfirmed(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const ideaId = String(formData.get("idea_id") ?? "");
  const unconfirmed = String(formData.get("unconfirmed") ?? "") === "true";
  if (!runsheetId || !ideaId) return;
  const supabase = await createClient();
  await supabase.from("trip_ideas").update({ unconfirmed }).eq("id", ideaId);
  revalidateIdeas(runsheetId);
}

/**
 * Move an idea onto a day: creates a slot at a category-appropriate default time and
 * takes the idea out of the pool. Times are a starting point — edit the slot after.
 */
export async function scheduleIdea(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const ideaId = String(formData.get("idea_id") ?? "");
  const dayYmd = String(formData.get("day") ?? "");
  if (!runsheetId || !ideaId || !dayYmd) return;

  const supabase = await createClient();

  const [{ data: runsheet }, { data: idea }] = await Promise.all([
    supabase.from("runsheets").select("timezone").eq("id", runsheetId).maybeSingle(),
    supabase.from("trip_ideas").select("*").eq("id", ideaId).maybeSingle(),
  ]);
  if (!runsheet || !idea) return;

  const { data: day } = await supabase
    .from("runsheet_days")
    .select("id")
    .eq("runsheet_id", runsheetId)
    .eq("day_date", dayYmd)
    .maybeSingle();
  if (!day) return;

  const tz = runsheet.timezone || "UTC";
  const { start, end } = defaultWindowForIdeaCategory(idea.category);
  const [sh, sm] = start.split(":").map(Number);

  const noteParts = [idea.note];
  if (idea.unconfirmed) {
    noteParts.push("Name unconfirmed — check before relying on it.");
  }
  const description = noteParts.filter(Boolean).join(" ") || null;

  await supabase.from("slots").insert({
    day_id: day.id,
    start_at: localWallToUtcIso(dayYmd, sh!, sm!, tz),
    end_at: localWallRangeEndUtcIso(dayYmd, tz, start, end),
    activity_type: slotTypeForIdeaCategory(idea.category),
    title: idea.text,
    description,
    location_name: idea.place,
    map_url: idea.place ? mapsSearchUrl(idea.place) : null,
  });

  await supabase.from("trip_ideas").delete().eq("id", ideaId);
  revalidateIdeas(runsheetId);
}
