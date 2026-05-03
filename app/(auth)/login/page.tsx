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
        <h1 className="text-2xl font-bold text-[#333]">Sign in</h1>
        <p className="mt-1 text-sm text-[#666]">Runsheet — shared timelines.</p>
      </div>
      <form action={signInWithPassword} className="rs-card space-y-4">
        {next?.startsWith("/") ? (
          <input type="hidden" name="next" value={next} />
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}
        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2]"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-[#4a90e2] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
        >
          Sign in
        </button>
      </form>
      <p className="text-center text-sm text-[#666]">
        <Link className="font-bold text-[#4a90e2]" href="/signup">
          Create account
        </Link>
        {" · "}
        <Link className="font-bold text-[#777]" href="/forgot-password">
          Forgot password
        </Link>
      </p>
    </div>
  );
}
