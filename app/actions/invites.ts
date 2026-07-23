"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function inviteToRunsheet(formData: FormData) {
  const runsheetId = String(formData.get("runsheet_id") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "editor");
  if (!runsheetId || !email) {
    if (runsheetId) redirect(`/runsheet/${runsheetId}/settings?error=invite-missing-email`);
    return;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const token = randomBytes(24).toString("hex");

  // Re-inviting the same address should just refresh the link. There is a unique index
  // on (runsheet_id, lower(email)), so clear any prior invite for this address first
  // rather than colliding with it.
  await supabase.from("runsheet_invites").delete().eq("runsheet_id", runsheetId).eq("email", email);

  const { error } = await supabase.from("runsheet_invites").insert({
    runsheet_id: runsheetId,
    email,
    role: role === "viewer" ? "viewer" : "editor",
    token,
    invited_by: user.id,
  });

  revalidatePath(`/runsheet/${runsheetId}`);
  revalidatePath(`/runsheet/${runsheetId}/settings`);
  if (error) {
    redirect(`/runsheet/${runsheetId}/settings?error=invite-failed`);
  }
  redirect(`/runsheet/${runsheetId}/settings?invited=${encodeURIComponent(email)}#invite`);
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_runsheet_invite", {
    invite_token: token,
  });
  return { ok: !error, error: error?.message };
}

export async function acceptInviteForm(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) return;
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("peek_invite", { invite_token: token });
  const peek = rows?.[0];
  if (!peek) {
    redirect(`/invite/${token}?error=missing`);
  }
  const { error } = await supabase.rpc("accept_runsheet_invite", {
    invite_token: token,
  });
  if (error) {
    redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/runsheet/${peek.runsheet_id}`);
}
