"use server";

import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { localWallToUtcIso } from "@/lib/dates";
import { normalizeActivityType } from "@/lib/activity-types";

function endIsoForSlot(
  dayYmd: string,
  timeZone: string,
  startHm: string,
  endHm: string | null,
  openEnd: boolean | undefined,
): string {
  const [sh, sm] = startHm.split(":").map(Number);
  const startIso = localWallToUtcIso(dayYmd, sh, sm, timeZone);
  if (openEnd) {
    return (
      DateTime.fromISO(startIso, { zone: "utc" }).plus({ hours: 4 }).toISO() ??
      startIso
    );
  }
  const ehmm = endHm ?? startHm;
  const [eh, em] = ehmm.split(":").map(Number);
  return localWallToUtcIso(dayYmd, eh, em, timeZone);
}

export async function createSlot(input: {
  runsheetId: string;
  dayYmd: string;
  timeZone: string;
  startHm: string;
  endHm: string | null;
  title: string;
  activityType: string;
  description?: string;
  descriptionBullets?: string[];
  linkUrl?: string | null;
  bookingRef?: string | null;
  contactInfo?: string | null;
  openEnd?: boolean;
}) {
  const supabase = await createClient();
  const [sh, sm] = input.startHm.split(":").map(Number);
  const startIso = localWallToUtcIso(input.dayYmd, sh, sm, input.timeZone);
  const endIso = endIsoForSlot(
    input.dayYmd,
    input.timeZone,
    input.startHm,
    input.endHm,
    input.openEnd,
  );

  const { data: day } = await supabase
    .from("runsheet_days")
    .select("id")
    .eq("runsheet_id", input.runsheetId)
    .eq("day_date", input.dayYmd)
    .maybeSingle();

  if (!day) return null;

  const bullets = input.descriptionBullets?.filter(Boolean) ?? [];

  const { data, error } = await supabase
    .from("slots")
    .insert({
      day_id: day.id,
      start_at: startIso,
      end_at: endIso,
      activity_type: normalizeActivityType(input.activityType),
      title: input.title || "Untitled",
      description: input.description ?? null,
      description_bullets: bullets,
      link_url: input.linkUrl || null,
      booking_ref: input.bookingRef ?? null,
      contact_info: input.contactInfo ?? null,
      open_ended: Boolean(input.openEnd),
    })
    .select("id")
    .single();

  if (error || !data) return null;
  revalidatePath(`/runsheet/${input.runsheetId}`);
  return data.id as string;
}

export async function updateSlot(input: {
  runsheetId: string;
  slotId: string;
  dayYmd: string;
  timeZone: string;
  startHm: string;
  endHm: string | null;
  title: string;
  activityType: string;
  description?: string;
  descriptionBullets?: string[];
  linkUrl?: string | null;
  bookingRef?: string | null;
  contactInfo?: string | null;
  openEnd?: boolean;
}) {
  const supabase = await createClient();
  const [sh, sm] = input.startHm.split(":").map(Number);
  const startIso = localWallToUtcIso(input.dayYmd, sh, sm, input.timeZone);
  const endIso = endIsoForSlot(
    input.dayYmd,
    input.timeZone,
    input.startHm,
    input.endHm,
    input.openEnd,
  );

  const { data: day } = await supabase
    .from("runsheet_days")
    .select("id")
    .eq("runsheet_id", input.runsheetId)
    .eq("day_date", input.dayYmd)
    .maybeSingle();

  if (!day) return;

  const bullets = input.descriptionBullets?.filter(Boolean) ?? [];

  await supabase
    .from("slots")
    .update({
      day_id: day.id,
      start_at: startIso,
      end_at: endIso,
      activity_type: normalizeActivityType(input.activityType),
      title: input.title || "Untitled",
      description: input.description ?? null,
      description_bullets: bullets,
      link_url: input.linkUrl || null,
      booking_ref: input.bookingRef ?? null,
      contact_info: input.contactInfo ?? null,
      open_ended: Boolean(input.openEnd),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.slotId);

  revalidatePath(`/runsheet/${input.runsheetId}`);
  revalidatePath(`/runsheet/${input.runsheetId}/activity/${input.slotId}`);
}

export async function deleteSlot(runsheetId: string, slotId: string) {
  const supabase = await createClient();
  await supabase.from("slots").delete().eq("id", slotId);
  revalidatePath(`/runsheet/${runsheetId}`);
  redirect(`/runsheet/${runsheetId}`);
}

export async function deleteSlotFromForm(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  if (!runsheetId || !slotId) return;
  await deleteSlot(runsheetId, slotId);
}

export async function updateSlotFromForm(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  const dayYmd = String(formData.get("day_ymd") ?? "");
  const timeZone = String(formData.get("timezone") ?? "UTC");
  const startHm = String(formData.get("start_hm") ?? "09:00");
  const endHm = String(formData.get("end_hm") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const activityType = String(formData.get("activity_type") ?? "other");
  const description = String(formData.get("description") ?? "");
  const linkUrl = String(formData.get("link_url") ?? "").trim() || null;
  const bookingRef = String(formData.get("booking_ref") ?? "").trim() || null;
  const contactInfo = String(formData.get("contact_info") ?? "").trim() || null;
  const openEnd = formData.get("open_end") === "on";
  const bulletsRaw = String(formData.get("bullets") ?? "");
  const descriptionBullets = bulletsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await updateSlot({
    runsheetId,
    slotId,
    dayYmd,
    timeZone,
    startHm,
    endHm: endHm || null,
    title,
    activityType,
    description,
    descriptionBullets,
    linkUrl,
    bookingRef,
    contactInfo,
    openEnd,
  });
  redirect(`/runsheet/${runsheetId}?day=${dayYmd}`);
}

export async function createSlotFromForm(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const dayYmd = String(formData.get("day_ymd") ?? "");
  const timeZone = String(formData.get("timezone") ?? "UTC");
  const startHm = String(formData.get("start_hm") ?? "09:00");
  const endHm = String(formData.get("end_hm") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const activityType = String(formData.get("activity_type") ?? "other");
  const description = String(formData.get("description") ?? "");
  const linkUrl = String(formData.get("link_url") ?? "").trim() || null;
  const bookingRef = String(formData.get("booking_ref") ?? "").trim() || null;
  const contactInfo = String(formData.get("contact_info") ?? "").trim() || null;
  const openEnd = formData.get("open_end") === "on";
  const bulletsRaw = String(formData.get("bullets") ?? "");
  const descriptionBullets = bulletsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const id = await createSlot({
    runsheetId,
    dayYmd,
    timeZone,
    startHm,
    endHm: endHm || null,
    title,
    activityType,
    description,
    descriptionBullets,
    linkUrl,
    bookingRef,
    contactInfo,
    openEnd,
  });
  if (id) {
    redirect(`/runsheet/${runsheetId}/activity/${id}`);
  }
  redirect(`/runsheet/${runsheetId}?day=${dayYmd}&error=slot`);
}
