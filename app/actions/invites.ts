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

  const normalizedRole = role === "viewer" ? "viewer" : "editor";

  // Preferred path: a SECURITY DEFINER RPC that upserts and returns the token, immune to
  // the runsheet_invites RLS quirks (blocked read-back, delete that does not clear the
  // row) seen on the deployed database. Mirrors how create_runsheet works.
  const { data: rpcToken, error: rpcError } = await supabase.rpc("create_runsheet_invite", {
    p_runsheet_id: runsheetId,
    p_email: email,
    p_role: normalizedRole,
  });

  let token: string | null =
    typeof rpcToken === "string" && rpcToken.length > 0 ? rpcToken : null;
  let failure = rpcError?.message ?? null;

  // Fallback for databases that do not have the RPC yet: delete-then-insert, and if the
  // row cannot be cleared, reuse the existing invite's token so the owner still gets a
  // working link.
  if (!token) {
    const fresh = randomBytes(24).toString("hex");
    await supabase
      .from("runsheet_invites")
      .delete()
      .eq("runsheet_id", runsheetId)
      .ilike("email", email);
    const { error: insertError } = await supabase.from("runsheet_invites").insert({
      runsheet_id: runsheetId,
      email,
      role: normalizedRole,
      token: fresh,
      invited_by: user.id,
    });
    if (!insertError) {
      token = fresh;
      failure = null;
    } else if (insertError.code === "23505") {
      const { data: existing } = await supabase
        .from("runsheet_invites")
        .select("token")
        .eq("runsheet_id", runsheetId)
        .ilike("email", email)
        .maybeSingle();
      token = existing?.token ?? null;
      failure = token ? null : insertError.message;
    } else {
      failure = insertError.message;
    }
  }

  revalidatePath(`/runsheet/${runsheetId}`);
  revalidatePath(`/runsheet/${runsheetId}/settings`);

  if (!token) {
    console.error("[inviteToRunsheet] failed", { rpcError, failure });
    redirect(
      `/runsheet/${runsheetId}/settings?error=invite-failed&msg=${encodeURIComponent(
        failure ?? "unknown error",
      )}`,
    );
  }

  // Pass the token back so the share link shows immediately, without depending on a
  // read-back that RLS may block. The recipient must still sign in with the invited
  // address to accept, so the token in the owner's own URL is low-risk.
  redirect(
    `/runsheet/${runsheetId}/settings?invited=${encodeURIComponent(email)}&newToken=${token}#invite`,
  );
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
