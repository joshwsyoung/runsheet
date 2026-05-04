import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireV1Auth } from "@/lib/api/v1-auth";

export async function GET(request: Request) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { data, error } = await auth.supabase
    .from("runsheets")
    .select("id, title, timezone, start_date, end_date, created_at, archived_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  return NextResponse.json({ runsheets: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  let body: { title?: string; timezone?: string; start_date?: string; end_date?: string };
  try {
    body = (await request.json()) as {
      title?: string;
      timezone?: string;
      start_date?: string;
      end_date?: string;
    };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim();
  const timezone = String(body.timezone ?? "UTC").trim() || "UTC";
  const startDate = String(body.start_date ?? "").trim();
  const endDate = String(body.end_date ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "validation", fields: { title: "required" } }, { status: 400 });
  }
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "validation", fields: { start_date: "required", end_date: "required" } },
      { status: 400 },
    );
  }
  if (startDate > endDate) {
    return NextResponse.json(
      { error: "validation", fields: { end_date: "must be on or after start_date" } },
      { status: 400 },
    );
  }

  const { data: rpcId, error: rpcError } = await auth.supabase.rpc("create_runsheet", {
    p_title: title,
    p_timezone: timezone,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  let id = typeof rpcId === "string" && rpcId.length > 0 ? rpcId : null;
  if (!id) {
    const { data: inserted, error: insertError } = await auth.supabase
      .from("runsheets")
      .insert({
        title,
        owner_id: auth.user.id,
        timezone,
        start_date: startDate,
        end_date: endDate,
      })
      .select("id");
    id = inserted?.[0]?.id ?? null;
    if (insertError || !id) {
      return NextResponse.json(
        {
          error: "create_failed",
          rpc: rpcError?.message,
          insert: insertError?.message,
        },
        { status: 400 },
      );
    }
  }
  revalidatePath("/dashboard");
  return NextResponse.json({ id, title, timezone, start_date: startDate, end_date: endDate }, { status: 201 });
}
