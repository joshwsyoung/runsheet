import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireV1Auth } from "@/lib/api/v1-auth";
import { deleteSlotRecord, updateSlot } from "@/app/actions/slots";
import { normalizeTodosFromApiBody } from "@/lib/slot-todos";
import type { RunsheetDb } from "@/lib/supabase/db-client";

type Ctx = { params: Promise<{ runsheetId: string; slotId: string }> };

async function assertSlotInRunsheet(
  supabase: RunsheetDb,
  runsheetId: string,
  slotId: string,
): Promise<{ ok: true; dayYmd: string } | { ok: false }> {
  const { data: slot, error: sErr } = await supabase.from("slots").select("id, day_id").eq("id", slotId).maybeSingle();
  if (sErr || !slot) return { ok: false };
  const { data: day, error: dErr } = await supabase
    .from("runsheet_days")
    .select("runsheet_id, day_date")
    .eq("id", slot.day_id)
    .maybeSingle();
  if (dErr || !day || day.runsheet_id !== runsheetId) return { ok: false };
  return { ok: true, dayYmd: day.day_date };
}

export async function GET(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId, slotId } = await context.params;
  const gate = await assertSlotInRunsheet(auth.supabase, runsheetId, slotId);
  if (!gate.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data, error } = await auth.supabase.from("slots").select("*").eq("id", slotId).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ slot: data });
}

export async function PATCH(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId, slotId } = await context.params;
  const gate = await assertSlotInRunsheet(auth.supabase, runsheetId, slotId);
  if (!gate.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data: rs } = await auth.supabase
    .from("runsheets")
    .select("timezone")
    .eq("id", runsheetId)
    .maybeSingle();
  const tz = rs?.timezone || "UTC";
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dayYmd = String(body.dayYmd ?? body.day ?? gate.dayYmd);
  const startHm = String(body.startHm ?? "09:00");
  const endHm = body.endHm != null && body.endHm !== "" ? String(body.endHm) : null;
  const title = String(body.title ?? "").trim() || "Untitled";
  const activityType = String(body.activityType ?? body.activity_type ?? "other");
  const description = body.description != null ? String(body.description) : undefined;
  const descriptionBullets = Array.isArray(body.descriptionBullets)
    ? (body.descriptionBullets as unknown[]).map(String)
    : Array.isArray(body.description_bullets)
      ? (body.description_bullets as unknown[]).map(String)
      : undefined;
  const todosFromBody =
    body.todos !== undefined && body.todos !== null
      ? normalizeTodosFromApiBody(body.todos)
      : undefined;
  const linkUrl =
    body.linkUrl != null ? String(body.linkUrl).trim() || null : body.link_url != null
      ? String(body.link_url).trim() || null
      : null;
  const mapUrl = body.mapUrl != null ? String(body.mapUrl).trim() || null : body.map_url != null
    ? String(body.map_url).trim() || null
    : null;
  const fromLocation = body.fromLocation != null
    ? String(body.fromLocation).trim() || null
    : body.from_location != null
      ? String(body.from_location).trim() || null
      : null;
  const toLocation = body.toLocation != null
    ? String(body.toLocation).trim() || null
    : body.to_location != null
      ? String(body.to_location).trim() || null
      : null;
  const flightNumber = body.flightNumber != null
    ? String(body.flightNumber).trim() || null
    : body.flight_number != null
      ? String(body.flight_number).trim() || null
      : null;
  const locationName = body.locationName != null
    ? String(body.locationName).trim() || null
    : body.location_name != null
      ? String(body.location_name).trim() || null
      : null;
  const bookingRef =
    body.bookingRef != null
      ? String(body.bookingRef).trim() || null
      : body.booking_ref != null
        ? String(body.booking_ref).trim() || null
        : null;
  const contactInfo =
    body.contactInfo != null
      ? String(body.contactInfo).trim() || null
      : body.contact_info != null
        ? String(body.contact_info).trim() || null
        : null;
  const openEnd = Boolean(body.openEnd ?? body.open_end);

  await updateSlot(
    {
      runsheetId,
      slotId,
      dayYmd,
      timeZone: tz,
      startHm,
      endHm,
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
      openEnd,
      ...(todosFromBody !== undefined ? { todos: todosFromBody } : {}),
    },
    auth.supabase,
  );
  const { data: slot } = await auth.supabase.from("slots").select("*").eq("id", slotId).maybeSingle();
  revalidatePath(`/runsheet/${runsheetId}`);
  return NextResponse.json({ slot });
}

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireV1Auth(_request);
  if ("error" in auth) return auth.error;
  const { runsheetId, slotId } = await context.params;
  const gate = await assertSlotInRunsheet(auth.supabase, runsheetId, slotId);
  if (!gate.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await deleteSlotRecord(runsheetId, slotId, auth.supabase);
  return NextResponse.json({ ok: true });
}
