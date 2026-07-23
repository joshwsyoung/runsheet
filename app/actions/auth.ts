"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthSiteUrl } from "@/lib/site-url";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg =
      error.message === "Invalid login credentials"
        ? "Invalid login credentials. If your account exists, reset your password from the Forgot password link, or try a different password."
        : error.message;
    const q = new URLSearchParams({ error: msg });
    if (next.startsWith("/")) {
      q.set("next", next);
    }
    redirect(`/login?${q.toString()}`);
  }
  revalidatePath("/", "layout");
  if (next.startsWith("/")) {
    redirect(next);
  }
  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const siteUrl = await getAuthSiteUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  /*
   Supabase succeeds with identities=[] when signing up again with an email that already belongs
   to a user (`user_repeated_signup`). Don't show "check your email" in that situation.
   */
  const identities = data.user?.identities ?? [];
  if (!data.session && identities.length === 0) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "That email already has an account. Sign in, or use “Forgot password” on the login page.",
      )}`,
    );
  }
  redirect(`/signup?confirm=1&email=${encodeURIComponent(email)}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const siteUrl = await getAuthSiteUrl();
  const supabase = await createClient();
  // Sends the recovery email. If the template includes the {{ .Token }} code, the user
  // can type it on /reset-password — immune to the link-prefetch that expires magic
  // links. The magic link still works too (it lands on /auth/callback).
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/account/password`,
  });
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/reset-password?email=${encodeURIComponent(email)}&sent=1`);
}

/**
 * Complete a password reset with the 6-digit code from the recovery email.
 *
 * verifyOtp establishes a session from the code, then updateUser sets the new password.
 * A typed code cannot be consumed by an email scanner the way a magic link can, so this
 * avoids the "otp_expired" failure entirely.
 */
export async function resetPasswordWithCode(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const password = String(formData.get("password") ?? "");
  const back = (msg: string) =>
    redirect(`/reset-password?email=${encodeURIComponent(email)}&error=${encodeURIComponent(msg)}`);

  if (!email || !token) back("Enter the code from the email.");

  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (otpError) {
    back(
      /expired|invalid/i.test(otpError.message)
        ? "That code is invalid or has expired. Request a new one below."
        : otpError.message,
    );
  }
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) back(updateError.message);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function resendSignupConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/signup?confirm=1");
  }
  const siteUrl = await getAuthSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error) {
    redirect(
      `/signup?confirm=1&email=${encodeURIComponent(email)}&resendError=${encodeURIComponent(error.message)}`,
    );
  }
  redirect(`/signup?confirm=1&email=${encodeURIComponent(email)}&resent=1`);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/account/password?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}
