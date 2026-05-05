import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireV1Auth } from "@/lib/api/v1-auth";
import { createSlot } from "@/app/actions/slots";

type Ctx = { params: Promise<{ runsheetId: string }> };

export async function GET(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const dayYmd = new URL(request.url).searchParams.get("day");
  if (!dayYmd) {
    return NextResponse.json({ error: "query_day_required", hint: "?day=2026-05-21" }, { status: 400 });
  }
  const { data: day, error: dayErr } = await auth.supabase
    .from("runsheet_days")
    .select("id")
    .eq("runsheet_id", runsheetId)
    .eq("day_date", dayYmd)
    .maybeSingle();
  if (dayErr) {
    return NextResponse.json({ error: dayErr.message }, { status: 400 });
  }
  if (!day) {
    return NextResponse.json({ error: "day_not_found", hint: "POST /days with dates first" }, { status: 404 });
  }
  const { data: slots, error } = await auth.supabase
    .from("slots")
    .select("*")
    .eq("day_id", day.id)
    .order("start_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ slots: slots ?? [] });
}

export async function POST(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const { data: rs } = await auth.supabase
    .from("runsheets")
    .select("timezone")
    .eq("id", runsheetId)
    .maybeSingle();
  if (!rs) {
    return NextResponse.json({ error: "runsheet_not_found" }, { status: 404 });
  }
  const tz = rs.timezone || "UTC";
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dayYmd = String(body.dayYmd ?? body.day ?? "").trim();
  const startHm = String(body.startHm ?? "09:00");
  const endHm = body.endHm != null && body.endHm !== "" ? String(body.endHm) : null;
  const title = String(body.title ?? "").trim();
  const activityType = String(body.activityType ?? body.activity_type ?? "other");
  const description = body.description != null ? String(body.description) : undefined;
  const descriptionBullets = Array.isArray(body.descriptionBullets)
    ? (body.descriptionBullets as unknown[]).map(String)
    : Array.isArray(body.description_bullets)
      ? (body.description_bullets as unknown[]).map(String)
      : undefined;
  const todos = Array.isArray(body.todos)
    ? (body.todos as unknown[]).map(String)
    : undefined;
  const linkUrl =
    body.linkUrl != null ? String(body.linkUrl).trim() || null : body.link_url != null
      ? String(body.link_url).trim() || null
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

  if (!dayYmd || !title) {
    return NextResponse.json(
      { error: "validation", fields: { dayYmd: dayYmd ? undefined : "required", title: title ? undefined : "required" } },
      { status: 400 },
    );
  }

  const id = await createSlot(
    {
      runsheetId,
      dayYmd,
      timeZone: tz,
      startHm,
      endHm,
      title,
      activityType,
      description,
      descriptionBullets,
      linkUrl,
      bookingRef,
      contactInfo,
      openEnd,
      todos,
    },
    auth.supabase,
  );
  if (!id) {
    return NextResponse.json({ error: "slot_create_failed", hint: "Ensure day exists (POST /days)" }, { status: 400 });
  }
  revalidatePath(`/runsheet/${runsheetId}`);
  return NextResponse.json({ id }, { status: 201 });
}
