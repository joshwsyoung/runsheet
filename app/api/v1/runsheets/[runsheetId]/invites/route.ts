import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireV1Auth } from "@/lib/api/v1-auth";

type Ctx = { params: Promise<{ runsheetId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const auth = await requireV1Auth(_request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const { data: rs } = await auth.supabase
    .from("runsheets")
    .select("owner_id")
    .eq("id", runsheetId)
    .maybeSingle();
  if (!rs || rs.owner_id !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { data, error } = await auth.supabase
    .from("runsheet_invites")
    .select("*")
    .eq("runsheet_id", runsheetId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ invites: data ?? [] });
}

export async function POST(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const { data: rs } = await auth.supabase
    .from("runsheets")
    .select("owner_id")
    .eq("id", runsheetId)
    .maybeSingle();
  if (!rs || rs.owner_id !== auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { email?: string; role?: string };
  try {
    body = (await request.json()) as { email?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const role = body.role === "viewer" ? "viewer" : "editor";
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }
  const token = randomBytes(24).toString("hex");
  const { data: row, error } = await auth.supabase
    .from("runsheet_invites")
    .insert({
      runsheet_id: runsheetId,
      email,
      role,
      token,
      invited_by: auth.user.id,
    })
    .select("*")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  revalidatePath(`/runsheet/${runsheetId}`);
  return NextResponse.json({ invite: row }, { status: 201 });
}
