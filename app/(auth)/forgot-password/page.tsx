import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rs-text">Reset password</h1>
        <p className="mt-1 text-sm text-rs-muted">
          We will email you a link to choose a new password.
        </p>
      </div>
      {sent ? (
        <div className="rs-card text-sm text-rs-secondary">
          If an account exists for that address, a reset link is on the way.
        </div>
      ) : (
        <form action={requestPasswordReset} className="rs-card space-y-4">
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
          <button
            type="submit"
            className="w-full rounded-xl bg-rs-primary py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
          >
            Send reset link
          </button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link className="font-bold text-rs-primary" href="/login">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
