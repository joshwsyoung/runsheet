import Link from "next/link";
import { signUpWithPassword, resendSignupConfirmation } from "@/app/actions/auth";
import { getAuthSiteUrl } from "@/lib/site-url";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirm?: string; email?: string; resent?: string; resendError?: string }>;
}) {
  const sp = await searchParams;
  const devCallbackHint =
    process.env.NODE_ENV === "development" ? await getAuthSiteUrl() : null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rs-text">Create account</h1>
        <p className="mt-1 text-sm text-rs-muted">Email and password for your runsheets.</p>
      </div>
      {sp.confirm ? (
        <div className="space-y-4">
          <div className="rs-card text-sm text-rs-secondary">
            <p className="font-bold text-rs-text">Check your email</p>
            <p className="mt-2">
              We sent a confirmation link
              {sp.email ? (
                <>
                  {" "}
                  to <span className="font-bold text-rs-text">{sp.email}</span>.
                </>
              ) : (
                <span>.</span>
              )}
            </p>
            <p className="mt-2">Open it to activate your account, then sign in on the login page.</p>
            {sp.resent === "1" ? (
              <p className="rs-alert-danger mt-3 text-[0.8rem]" role="status">
                Another message was queued; if it doesn’t arrive in a minute, check spam.
              </p>
            ) : null}
            {sp.resendError ? (
              <p className="rs-alert-danger mt-3 text-[0.8rem]">{decodeURIComponent(sp.resendError)}</p>
            ) : null}
          </div>
          <form action={resendSignupConfirmation} className="rs-card space-y-3 text-sm">
            {sp.email ? (
              <input type="hidden" name="email" value={sp.email} />
            ) : (
              <div>
                <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                  Email address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="same as signup"
                  className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-rs-primary"
                />
              </div>
            )}
            <div>
              {!sp.email ? "Didn’t get the email? " : "Still nothing? "}
              <button
                type="submit"
                className="rounded-lg border-0 bg-rs-primary px-3 py-1.5 text-[0.8rem] font-bold text-white"
              >
                Resend confirmation email
              </button>
            </div>
          </form>
          {process.env.NODE_ENV === "development" && devCallbackHint ? (
            <details className="rounded-[14px] border border-rs-border bg-rs-muted-surface px-3 py-2 text-[0.75rem] text-rs-secondary">
              <summary className="cursor-pointer font-bold text-rs-text">Local dev: email setup</summary>
              <p className="mt-2">
                Supabase rejects confirmation links unless this exact redirect is allowed — add it under Authentication → URL
                Configuration → Redirect URLs:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-rs-code-bg px-2 py-2 text-rs-text">
                {`${devCallbackHint}/auth/callback`}
              </pre>
              <p className="mt-2">
                Use the URL you opened in your browser today (correct port).
                Optionally disable “Confirm email” for this project during development — Authentication → Providers → Email.
              </p>
            </details>
          ) : null}
        </div>
      ) : (
        <form action={signUpWithPassword} className="rs-card space-y-4">
          {sp.error ? (
            <p className="rs-alert-danger text-sm">
              {decodeURIComponent(sp.error)}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-rs-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-rs-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-rs-primary py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
          >
            Sign up
          </button>
        </form>
      )}
      <p className="text-center text-sm text-rs-muted">
        <Link className="font-bold text-rs-primary" href="/login">
          Already have an account?
        </Link>
      </p>
    </div>
  );
}
