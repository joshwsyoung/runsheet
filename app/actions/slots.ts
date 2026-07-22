"use server";

import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RunsheetDb } from "@/lib/supabase/db-client";
import { localWallRangeEndUtcIso, localWallToUtcIso } from "@/lib/dates";
import { normalizeActivityType } from "@/lib/activity-types";
import {
  mergeSlotTodosFromLines,
  newTodoId,
  normalizeSlotTodosForWrite,
  parseSlotTodosFromJson,
  slotTodosToDbJson,
  type SlotTodoItem,
} from "@/lib/slot-todos";

function parseJsonStringArray(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A form-posted coordinate: empty or non-numeric becomes null. */
function coordFromForm(formData: FormData, field: string): number | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

type SlotCoords = {
  fromLat: number | null;
  fromLng: number | null;
  toLat: number | null;
  toLng: number | null;
  locationLat: number | null;
  locationLng: number | null;
};

function slotCoordsFromForm(formData: FormData): SlotCoords {
  return {
    fromLat: coordFromForm(formData, "from_lat"),
    fromLng: coordFromForm(formData, "from_lng"),
    toLat: coordFromForm(formData, "to_lat"),
    toLng: coordFromForm(formData, "to_lng"),
    locationLat: coordFromForm(formData, "location_lat"),
    locationLng: coordFromForm(formData, "location_lng"),
  };
}

/**
 * Best-effort write of the resolved coordinates.
 *
 * Kept out of the main insert/update so a slot still saves on a database that has not
 * yet had the coordinate columns migrated in — the pins are an enhancement, never a
 * precondition for saving the slot.
 */
async function writeSlotCoords(
  client: RunsheetDb,
  slotId: string,
  coords: SlotCoords | undefined,
) {
  if (!coords) return;
  const { error } = await client
    .from("slots")
    .update({
      from_lat: coords.fromLat,
      from_lng: coords.fromLng,
      to_lat: coords.toLat,
      to_lng: coords.toLng,
      location_lat: coords.locationLat,
      location_lng: coords.locationLng,
    })
    .eq("id", slotId);
  // A missing-column error just means the migration has not run yet; ignore it so the
  // slot save is never blocked by an un-applied migration.
  if (error) return;
}

function flightMetaFromForm(formData: FormData): Record<string, string> | null {
  const entries: Array<[string, string]> = [
    ["airline", String(formData.get("flight_airline") ?? "").trim()],
    ["departureAirport", String(formData.get("flight_departure_airport") ?? "").trim()],
    ["arrivalAirport", String(formData.get("flight_arrival_airport") ?? "").trim()],
    ["departureTerminal", String(formData.get("flight_departure_terminal") ?? "").trim()],
    ["arrivalTerminal", String(formData.get("flight_arrival_terminal") ?? "").trim()],
    ["seat", String(formData.get("flight_seat") ?? "").trim()],
    ["gate", String(formData.get("flight_gate") ?? "").trim()],
    ["boardingTime", String(formData.get("flight_boarding_time") ?? "").trim()],
    ["checkInUrl", String(formData.get("flight_checkin_url") ?? "").trim()],
  ];
  const filtered = entries.filter(([, v]) => v);
  if (!filtered.length) return null;
  return Object.fromEntries(filtered);
}

function endIsoForSlot(
  startDayYmd: string,
  endDayYmd: string | null,
  timeZone: string,
  startHm: string,
  endHm: string | null,
  openEnd: boolean | undefined,
): string {
  const [sh, sm] = startHm.split(":").map(Number);
  const startIso = localWallToUtcIso(startDayYmd, sh, sm, timeZone);
  if (openEnd) {
    return (
      DateTime.fromISO(startIso, { zone: "utc" }).plus({ hours: 4 }).toISO() ??
      startIso
    );
  }
  const ehmm = endHm ?? startHm;
  if (endDayYmd) {
    const [eh, em] = ehmm.split(":").map(Number);
    return localWallToUtcIso(endDayYmd, eh, em, timeZone);
  }
  return localWallRangeEndUtcIso(startDayYmd, timeZone, startHm, ehmm);
}

export async function createSlot(input: {
  runsheetId: string;
  dayYmd: string;
  endDayYmd?: string | null;
  timeZone: string;
  startHm: string;
  endHm: string | null;
  title: string;
  activityType: string;
  description?: string;
  descriptionBullets?: string[];
  linkUrl?: string | null;
  mapUrl?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  flightNumber?: string | null;
  locationName?: string | null;
  bookingRef?: string | null;
  contactInfo?: string | null;
  flightMeta?: Record<string, string> | null;
  attachmentUrls?: string[] | null;
  openEnd?: boolean;
  todos?: string[] | SlotTodoItem[];
  coords?: SlotCoords;
}, client?: RunsheetDb) {
  const supabase = client ?? (await createClient());
  const [sh, sm] = input.startHm.split(":").map(Number);
  const startIso = localWallToUtcIso(input.dayYmd, sh, sm, input.timeZone);
  const endIso = endIsoForSlot(
    input.dayYmd,
    input.endDayYmd ?? null,
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
  const todos = slotTodosToDbJson(normalizeSlotTodosForWrite(input.todos));

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
      todos,
      from_location: input.fromLocation ?? null,
      to_location: input.toLocation ?? null,
      flight_number: input.flightNumber ?? null,
      location_name: input.locationName ?? null,
      map_url: input.mapUrl ?? null,
      link_url: input.linkUrl || null,
      booking_ref: input.bookingRef ?? null,
      contact_info: input.contactInfo ?? null,
      flight_meta: input.flightMeta ?? null,
      attachment_urls: input.attachmentUrls ?? null,
      open_ended: Boolean(input.openEnd),
    })
    .select("id");

  const newId = data?.[0]?.id;
  if (error || !newId) return null;
  await writeSlotCoords(supabase, newId as string, input.coords);
  revalidatePath(`/runsheet/${input.runsheetId}`);
  return newId as string;
}

export async function updateSlot(input: {
  runsheetId: string;
  slotId: string;
  dayYmd: string;
  endDayYmd?: string | null;
  timeZone: string;
  startHm: string;
  endHm: string | null;
  title: string;
  activityType: string;
  description?: string;
  descriptionBullets?: string[];
  linkUrl?: string | null;
  mapUrl?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  flightNumber?: string | null;
  locationName?: string | null;
  bookingRef?: string | null;
  contactInfo?: string | null;
  flightMeta?: Record<string, string> | null;
  attachmentUrls?: string[] | null;
  openEnd?: boolean;
  todos?: string[] | SlotTodoItem[];
  coords?: SlotCoords;
}, client?: RunsheetDb) {
  const supabase = client ?? (await createClient());
  const [sh, sm] = input.startHm.split(":").map(Number);
  const startIso = localWallToUtcIso(input.dayYmd, sh, sm, input.timeZone);
  const endIso = endIsoForSlot(
    input.dayYmd,
    input.endDayYmd ?? null,
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
  const todosClean =
    input.todos !== undefined
      ? slotTodosToDbJson(normalizeSlotTodosForWrite(input.todos))
      : undefined;

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
      ...(todosClean !== undefined ? { todos: todosClean } : {}),
      from_location: input.fromLocation ?? null,
      to_location: input.toLocation ?? null,
      flight_number: input.flightNumber ?? null,
      location_name: input.locationName ?? null,
      map_url: input.mapUrl ?? null,
      link_url: input.linkUrl ?? null,
      booking_ref: input.bookingRef ?? null,
      contact_info: input.contactInfo ?? null,
      flight_meta: input.flightMeta ?? null,
      attachment_urls: input.attachmentUrls ?? null,
      open_ended: Boolean(input.openEnd),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.slotId);

  await writeSlotCoords(supabase, input.slotId, input.coords);

  revalidatePath(`/runsheet/${input.runsheetId}`);
  revalidatePath(`/runsheet/${input.runsheetId}/activity/${input.slotId}`);
}

/** Deletes a slot without redirecting (for API routes). */
export async function deleteSlotRecord(
  runsheetId: string,
  slotId: string,
  client?: RunsheetDb,
) {
  const supabase = client ?? (await createClient());
  await supabase.from("slots").delete().eq("id", slotId);
  revalidatePath(`/runsheet/${runsheetId}`);
}

export async function deleteSlot(runsheetId: string, slotId: string) {
  await deleteSlotRecord(runsheetId, slotId);
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
  const startDayYmd = String(formData.get("start_day_ymd") ?? formData.get("day_ymd") ?? "");
  const endDayYmdRaw = String(formData.get("end_day_ymd") ?? "");
  const endDayYmd = endDayYmdRaw || startDayYmd;
  const timeZone = String(formData.get("timezone") ?? "UTC");
  const startHm = String(formData.get("start_hm") ?? "09:00");
  const endHm = String(formData.get("end_hm") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const activityType = String(formData.get("activity_type") ?? "other");
  const description = String(formData.get("description") ?? "");
  const linkUrl = String(formData.get("link_url") ?? "").trim() || null;
  const mapUrl = String(formData.get("map_url") ?? "").trim() || null;
  const fromLocation = String(formData.get("from_location") ?? "").trim() || null;
  const toLocation = String(formData.get("to_location") ?? "").trim() || null;
  const flightNumber = String(formData.get("flight_number") ?? "").trim() || null;
  const locationName = String(formData.get("location_name") ?? "").trim() || null;
  const bookingRef = String(formData.get("booking_ref") ?? "").trim() || null;
  const contactInfo = String(formData.get("contact_info") ?? "").trim() || null;
  const openEnd = formData.get("open_end") === "on";
  const flightMeta = flightMetaFromForm(formData);
  const attachmentUrls = parseJsonStringArray(String(formData.get("attachment_urls") ?? ""));
  const bulletsRaw = String(formData.get("bullets") ?? "");
  const descriptionBullets = bulletsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const todosRaw = String(formData.get("todos") ?? "");
  const supabase = await createClient();
  const { data: curSlot } = await supabase.from("slots").select("todos").eq("id", slotId).maybeSingle();
  const prevTodos = parseSlotTodosFromJson(curSlot?.todos);
  const lines = todosRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const todos = mergeSlotTodosFromLines(prevTodos, lines);
  const coords = slotCoordsFromForm(formData);

  await updateSlot({
    runsheetId,
    slotId,
    dayYmd: startDayYmd,
    endDayYmd,
    timeZone,
    startHm,
    endHm: endHm || null,
    title,
    activityType,
    description,
    descriptionBullets,
    linkUrl,
    mapUrl,
    fromLocation,
    toLocation,
    flightNumber,
    locationName,
    bookingRef,
    contactInfo,
    flightMeta,
    attachmentUrls,
    openEnd,
    todos,
    coords,
  });
  redirect(`/runsheet/${runsheetId}?day=${startDayYmd}`);
}

export async function createSlotFromForm(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const startDayYmd = String(formData.get("start_day_ymd") ?? formData.get("day_ymd") ?? "");
  const endDayYmdRaw = String(formData.get("end_day_ymd") ?? "");
  const endDayYmd = endDayYmdRaw || startDayYmd;
  const timeZone = String(formData.get("timezone") ?? "UTC");
  const startHm = String(formData.get("start_hm") ?? "09:00");
  const endHm = String(formData.get("end_hm") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const activityType = String(formData.get("activity_type") ?? "other");
  const description = String(formData.get("description") ?? "");
  const linkUrl = String(formData.get("link_url") ?? "").trim() || null;
  const mapUrl = String(formData.get("map_url") ?? "").trim() || null;
  const fromLocation = String(formData.get("from_location") ?? "").trim() || null;
  const toLocation = String(formData.get("to_location") ?? "").trim() || null;
  const flightNumber = String(formData.get("flight_number") ?? "").trim() || null;
  const locationName = String(formData.get("location_name") ?? "").trim() || null;
  const bookingRef = String(formData.get("booking_ref") ?? "").trim() || null;
  const contactInfo = String(formData.get("contact_info") ?? "").trim() || null;
  const openEnd = formData.get("open_end") === "on";
  const flightMeta = flightMetaFromForm(formData);
  const attachmentUrls = parseJsonStringArray(String(formData.get("attachment_urls") ?? ""));
  const bulletsRaw = String(formData.get("bullets") ?? "");
  const descriptionBullets = bulletsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const todosRaw = String(formData.get("todos") ?? "");
  const lines = todosRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const todos = mergeSlotTodosFromLines([], lines);
  const coords = slotCoordsFromForm(formData);

  const id = await createSlot({
    runsheetId,
    dayYmd: startDayYmd,
    endDayYmd,
    timeZone,
    startHm,
    endHm: endHm || null,
    title,
    activityType,
    description,
    descriptionBullets,
    linkUrl,
    mapUrl,
    fromLocation,
    toLocation,
    flightNumber,
    locationName,
    bookingRef,
    contactInfo,
    flightMeta,
    attachmentUrls,
    openEnd,
    todos,
    coords,
  });
  if (id) {
    redirect(`/runsheet/${runsheetId}/activity/${id}`);
  }
  redirect(`/runsheet/${runsheetId}?day=${startDayYmd}&error=slot`);
}

export async function toggleSlotTodoItem(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  const todoId = String(formData.get("todo_id") ?? "");
  const done = formData.get("done") === "true";
  if (!runsheetId || !slotId || !todoId) return;

  const supabase = await createClient();
  const { data: row } = await supabase.from("slots").select("todos").eq("id", slotId).maybeSingle();
  if (!row) return;

  const items = parseSlotTodosFromJson(row.todos);
  const next = items.map((item) =>
    item.id === todoId ? { ...item, done } : item,
  );

  await supabase
    .from("slots")
    .update({
      todos: slotTodosToDbJson(next),
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  revalidatePath(`/runsheet/${runsheetId}`);
  revalidatePath(`/runsheet/${runsheetId}/activity/${slotId}`);
}

export async function addSlotTodoFromForm(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const slotId = String(formData.get("slot_id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!runsheetId || !slotId || !text) return;

  const supabase = await createClient();
  const { data: row } = await supabase.from("slots").select("todos").eq("id", slotId).maybeSingle();
  if (!row) return;

  const items = parseSlotTodosFromJson(row.todos);
  items.push({ id: newTodoId(), text, done: false });

  await supabase
    .from("slots")
    .update({
      todos: slotTodosToDbJson(items),
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  revalidatePath(`/runsheet/${runsheetId}`);
  revalidatePath(`/runsheet/${runsheetId}/activity/${slotId}`);
}
