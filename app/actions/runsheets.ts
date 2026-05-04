"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createRunsheet(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "UTC").trim() || "UTC";
  if (!title) {
    redirect("/dashboard?error=missing-title");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: rpcId, error: rpcError } = await supabase.rpc(
    "create_runsheet",
    { p_title: title, p_timezone: timezone },
  );

  let runsheetId: string | null =
    typeof rpcId === "string" && rpcId.length > 0 ? rpcId : null;

  if (!runsheetId) {
    const { data: inserted, error: insertError } = await supabase
      .from("runsheets")
      .insert({ title, owner_id: user.id, timezone })
      .select("id");
    runsheetId = inserted?.[0]?.id ?? null;

    if (insertError || !runsheetId) {
      console.error("[createRunsheet] rpc", {
        message: rpcError?.message,
        code: rpcError?.code,
        details: rpcError?.details,
      });
      console.error("[createRunsheet] insert", {
        message: insertError?.message,
        code: insertError?.code,
        details: insertError?.details,
        hint: insertError?.hint,
      });
      redirect("/dashboard?error=create-failed");
    }
  }

  revalidatePath("/dashboard");
  redirect(`/runsheet/${runsheetId}`);
}

export async function archiveRunsheet(formData: FormData) {
  const runsheetId = String(formData.get("id") ?? "");
  if (!runsheetId) return;
  const supabase = await createClient();
  await supabase
    .from("runsheets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", runsheetId);
  revalidatePath("/dashboard");
}

export async function updateRunsheetTitle(runsheetId: string, title: string) {
  const supabase = await createClient();
  await supabase.from("runsheets").update({ title }).eq("id", runsheetId);
  revalidatePath(`/runsheet/${runsheetId}`);
}
