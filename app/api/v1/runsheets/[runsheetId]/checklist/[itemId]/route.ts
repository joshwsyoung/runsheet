import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireV1Auth } from "@/lib/api/v1-auth";

type Ctx = { params: Promise<{ runsheetId: string; itemId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId, itemId } = await context.params;
  const { data: item, error: iErr } = await auth.supabase
    .from("checklist_items")
    .select("id, day_id")
    .eq("id", itemId)
    .maybeSingle();
  if (iErr || !item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data: day, error: dErr } = await auth.supabase
    .from("runsheet_days")
    .select("runsheet_id")
    .eq("id", item.day_id)
    .maybeSingle();
  if (dErr || !day || day.runsheet_id !== runsheetId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  let body: { done?: boolean; label?: string };
  try {
    body = (await request.json()) as { done?: boolean; label?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const patch: { done?: boolean; label?: string } = {};
  if (typeof body.done === "boolean") patch.done = body.done;
  if (typeof body.label === "string") patch.label = body.label.trim();
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }
  const { data: updated, error } = await auth.supabase
    .from("checklist_items")
    .update(patch)
    .eq("id", itemId)
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  revalidatePath(`/runsheet/${runsheetId}`);
  return NextResponse.json({ item: updated });
}

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireV1Auth(_request);
  if ("error" in auth) return auth.error;
  const { runsheetId, itemId } = await context.params;
  const { data: item, error: iErr } = await auth.supabase
    .from("checklist_items")
    .select("id, day_id")
    .eq("id", itemId)
    .maybeSingle();
  if (iErr || !item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data: day, error: dErr } = await auth.supabase
    .from("runsheet_days")
    .select("runsheet_id")
    .eq("id", item.day_id)
    .maybeSingle();
  if (dErr || !day || day.runsheet_id !== runsheetId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { error } = await auth.supabase.from("checklist_items").delete().eq("id", itemId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  revalidatePath(`/runsheet/${runsheetId}`);
  return NextResponse.json({ ok: true });
}
