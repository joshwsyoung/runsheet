import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireV1Auth } from "@/lib/api/v1-auth";

type Ctx = { params: Promise<{ runsheetId: string }> };

export async function GET(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const dayYmd = new URL(request.url).searchParams.get("day");
  if (!dayYmd) {
    return NextResponse.json({ error: "query_day_required" }, { status: 400 });
  }
  const { data: day, error: dErr } = await auth.supabase
    .from("runsheet_days")
    .select("id")
    .eq("runsheet_id", runsheetId)
    .eq("day_date", dayYmd)
    .maybeSingle();
  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 400 });
  }
  if (!day) {
    return NextResponse.json({ error: "day_not_found" }, { status: 404 });
  }
  const { data: items, error } = await auth.supabase
    .from("checklist_items")
    .select("*")
    .eq("day_id", day.id)
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ items: items ?? [] });
}

export async function POST(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  let body: { day?: string; dayYmd?: string; label?: string };
  try {
    body = (await request.json()) as { day?: string; dayYmd?: string; label?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dayYmd = String(body.dayYmd ?? body.day ?? "").trim();
  const label = String(body.label ?? "").trim();
  if (!dayYmd || !label) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  const { data: day, error: dErr } = await auth.supabase
    .from("runsheet_days")
    .select("id")
    .eq("runsheet_id", runsheetId)
    .eq("day_date", dayYmd)
    .maybeSingle();
  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 400 });
  }
  if (!day) {
    return NextResponse.json({ error: "day_not_found" }, { status: 404 });
  }
  const { data: row, error } = await auth.supabase
    .from("checklist_items")
    .insert({ day_id: day.id, label })
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  revalidatePath(`/runsheet/${runsheetId}`);
  return NextResponse.json({ item: row }, { status: 201 });
}
