import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireV1Auth } from "@/lib/api/v1-auth";

type Ctx = { params: Promise<{ runsheetId: string }> };

export async function GET(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const { data, error } = await auth.supabase
    .from("runsheets")
    .select("id, title, owner_id, timezone, start_date, end_date, created_at, archived_at")
    .eq("id", runsheetId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ runsheet: data });
}

export async function PATCH(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
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
  const patch: {
    title?: string;
    timezone?: string;
    start_date?: string;
    end_date?: string;
  } = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.timezone === "string" && body.timezone.trim()) patch.timezone = body.timezone.trim();
  if (typeof body.start_date === "string" && body.start_date.trim())
    patch.start_date = body.start_date.trim();
  if (typeof body.end_date === "string" && body.end_date.trim()) patch.end_date = body.end_date.trim();
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const start = patch.start_date;
  const end = patch.end_date;
  const bothProvided = typeof start !== "undefined" && typeof end !== "undefined";
  const oneProvided = typeof start !== "undefined" || typeof end !== "undefined";
  if (oneProvided && !bothProvided) {
    return NextResponse.json(
      { error: "validation", message: "start_date and end_date must be updated together" },
      { status: 400 },
    );
  }
  if (bothProvided && start! > end!) {
    return NextResponse.json({ error: "validation", fields: { end_date: "must be >= start_date" } }, {
      status: 400,
    });
  }

  const { data, error } = await auth.supabase
    .from("runsheets")
    .update(patch)
    .eq("id", runsheetId)
    .select("id, title, timezone, start_date, end_date, archived_at")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  revalidatePath("/dashboard");
  revalidatePath(`/runsheet/${runsheetId}`);
  return NextResponse.json({ runsheet: data });
}

export async function DELETE(request: Request, context: Ctx) {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return auth.error;
  const { runsheetId } = await context.params;
  const { data, error } = await auth.supabase
    .from("runsheets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", runsheetId)
    .select("id")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, archived: runsheetId });
}
