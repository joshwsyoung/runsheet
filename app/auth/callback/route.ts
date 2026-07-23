import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for Supabase email links (signup confirmation and password recovery).
 *
 * Handles both auth flows Supabase can use:
 *   - PKCE: the link arrives with `?code=…`, exchanged for a session.
 *   - OTP:  the link arrives with `?token_hash=…&type=…`, verified directly.
 *
 * When the link is a password recovery and something goes wrong (most commonly the
 * one-time link was already opened — email security scanners often pre-fetch links and
 * consume them, or it simply expired), we send the user back to the reset page with a
 * clear message and the form to request a fresh link, rather than a dead generic error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  // Supabase may itself redirect here with an error (e.g. otp_expired) when the link is
  // already spent or expired.
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  const isRecovery = type === "recovery" || next.startsWith("/account/password");

  function fail() {
    if (isRecovery) {
      return NextResponse.redirect(`${origin}/forgot-password?error=link-expired`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  if (errorCode) return fail();

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail();
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail();
  }

  return fail();
}
