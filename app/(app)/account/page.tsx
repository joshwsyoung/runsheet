import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-4 pb-12 font-sans text-rs-text antialiased sm:p-6">
      <div className="w-full max-w-[450px] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-[0.8rem] font-bold text-rs-muted no-underline hover:text-rs-primary">
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-xl font-bold">Account</h1>
            <p className="mt-1 text-sm text-rs-muted">Signed in preferences for this browser.</p>
          </div>
        </div>

        <div className="rounded-[14px] border border-rs-border bg-rs-surface px-4 py-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">Email</p>
          <p className="mt-1 text-sm font-bold">{user.email}</p>
        </div>

        <div className="rounded-[14px] border border-rs-border bg-rs-surface px-4 py-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">Appearance</p>
          <div className="mt-3">
            <ThemeSwitcher />
          </div>
        </div>

        <p className="text-center text-sm text-rs-muted">
          <Link className="font-bold text-rs-primary hover:underline" href="/dashboard">
            Back to runsheets
          </Link>
        </p>
      </div>
    </div>
  );
}
