import Link from "next/link";
import { updatePassword } from "@/app/actions/auth";

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-dvh justify-center bg-[#fcfcfc] p-4">
      <div className="w-full max-w-[400px] space-y-6 pt-10">
        <div>
          <h1 className="text-2xl font-bold text-[#333]">New password</h1>
          <p className="mt-1 text-sm text-[#666]">Choose a password for your account.</p>
        </div>
        <form action={updatePassword} className="rs-card space-y-4">
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {decodeURIComponent(error)}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#4a90e2] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
          >
            Save password
          </button>
        </form>
        <p className="text-center text-sm">
          <Link className="font-bold text-[#4a90e2]" href="/dashboard">
            Cancel
          </Link>
        </p>
      </div>
    </div>
  );
}
