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
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/account/password`,
  });
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/forgot-password?sent=1");
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
