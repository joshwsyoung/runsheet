import { NextResponse } from "next/server";
import { requireV1Auth } from "@/lib/api/v1-auth";
import { upsertRunsheetDays } from "@/lib/runsheet-days";

type Ctx = { params: Promise<{ runsheetId: string }> };

export async function GET(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  let q = auth.supabase
    .from("runsheet_days")
    .select("id, runsheet_id, day_date, label, is_special")
    .eq("runsheet_id", runsheetId)
    .order("day_date", { ascending: true });
  if (from) q = q.gte("day_date", from);
  if (to) q = q.lte("day_date", to);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ days: data ?? [] });
}

/** Upsert calendar rows for this runsheet (same as app week seeding). */
export async function POST(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  let body: { dates?: string[] };
  try {
    body = (await request.json()) as { dates?: string[] };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const dates = Array.isArray(body.dates) ? body.dates.map((d) => String(d).trim()).filter(Boolean) : [];
  if (dates.length === 0) {
    return NextResponse.json({ error: "dates_required" }, { status: 400 });
  }
  await upsertRunsheetDays(auth.supabase, runsheetId, dates);
  const { data, error } = await auth.supabase
    .from("runsheet_days")
    .select("id, runsheet_id, day_date, label, is_special")
    .eq("runsheet_id", runsheetId)
    .in("day_date", dates)
    .order("day_date", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ days: data ?? [] });
}
