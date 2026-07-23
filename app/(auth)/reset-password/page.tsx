import Link from "next/link";
import { resetPasswordWithCode } from "@/app/actions/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string; error?: string }>;
}) {
  const { email, sent, error } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rs-text">Enter your code</h1>
        <p className="mt-1 text-sm text-rs-muted">
          We emailed a 6-digit code to reset your password. Enter it below with a new password.
        </p>
      </div>

      {sent ? (
        <div className="rs-card text-sm text-rs-secondary">
          If an account exists for {email ? <span className="font-bold text-rs-text">{email}</span> : "that address"}, a code is on its way. It expires soon, so use it promptly.
        </div>
      ) : null}

      <form action={resetPasswordWithCode} className="rs-card space-y-4">
        {error ? <p className="rs-alert-danger text-sm">{decodeURIComponent(error)}</p> : null}
        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            defaultValue={email ?? ""}
            autoComplete="email"
            className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-rs-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
            6-digit code
          </label>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="123456"
            className="w-full rounded-xl border border-rs-border px-3 py-2 text-center text-lg font-bold tracking-[0.3em] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-rs-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
            New password
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
          Set new password
        </button>
      </form>

      <p className="text-center text-sm text-rs-muted">
        Didn&apos;t get a code?{" "}
        <Link className="font-bold text-rs-primary" href="/forgot-password">
          Send another
        </Link>
      </p>
      <p className="text-center text-sm">
        <Link className="font-bold text-rs-primary" href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
