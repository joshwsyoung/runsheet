import Link from "next/link";
import { signInWithPassword } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rs-text">Sign in</h1>
        <p className="mt-1 text-sm text-rs-muted">Runsheet — shared timelines.</p>
      </div>
      <form action={signInWithPassword} className="rs-card space-y-4">
        {next?.startsWith("/") ? (
          <input type="hidden" name="next" value={next} />
        ) : null}
        {error ? (
          <p className="rs-alert-danger text-sm">
            {decodeURIComponent(error)}
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
            autoComplete="current-password"
            className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-rs-primary"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-rs-primary py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
        >
          Sign in
        </button>
      </form>
      <p className="text-center text-sm text-rs-muted">
        <Link className="font-bold text-rs-primary" href="/signup">
          Create account
        </Link>
        {" · "}
        <Link className="font-bold text-rs-subtle" href="/forgot-password">
          Forgot password
        </Link>
      </p>
    </div>
  );
}
