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
  const { data, error } = await supabase
    .from("runsheets")
    .insert({ title, owner_id: user.id, timezone })
    .select("id")
    .single();
  if (error || !data) {
    redirect("/dashboard?error=create-failed");
  }
  revalidatePath("/dashboard");
  redirect(`/runsheet/${data.id}`);
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
