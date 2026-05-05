import Link from "next/link";
import { signUpWithPassword } from "@/app/actions/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirm?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rs-text">Create account</h1>
        <p className="mt-1 text-sm text-rs-muted">Email and password for your runsheets.</p>
      </div>
      {sp.confirm ? (
        <div className="rs-card text-sm text-rs-secondary">
          Check your email to confirm your account, then return here to sign in.
        </div>
      ) : (
        <form action={signUpWithPassword} className="rs-card space-y-4">
          {sp.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
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
