import Link from "next/link";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { RunsheetListClient } from "@/components/dashboard/runsheet-list-client";

const CREATE_ERROR_COPY: Record<string, string> = {
  "missing-title": "Add a title before creating a runsheet.",
  "missing-dates": "Choose a trip start date and end date.",
  "invalid-dates": "End date must be on or after the start date.",
  "create-failed": "Something went wrong creating your runsheet. Try again.",
};

function createRunsheetErrorMessage(code: string | undefined) {
  if (!code) return null;
  return CREATE_ERROR_COPY[code] ?? "Could not create your runsheet. Try again.";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorCode } = await searchParams;
  const createErrorMessage = createRunsheetErrorMessage(errorCode);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: runsheets } = await supabase
    .from("runsheets")
    .select("id, title, timezone, start_date, end_date, created_at, archived_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const defaultStartUtc = DateTime.utc().toISODate() ?? "";
  const defaultEndUtc = DateTime.utc().plus({ days: 6 }).toISODate() ?? "";

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-16 sm:p-2.5">
      <div className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-none border-0 border-transparent bg-rs-surface shadow-none sm:rounded-[24px] sm:border sm:border-rs-border sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_12px_48px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between border-b border-rs-border px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-rs-text">Runsheets</h1>
            <p className="text-[0.72rem] font-bold uppercase tracking-wide text-rs-label">
              Signed in
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/account"
              className="text-xs font-bold text-rs-primary no-underline hover:underline"
            >
              Account
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl border border-rs-border bg-rs-surface px-3 py-1.5 text-xs font-bold text-rs-secondary"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <RunsheetListClient
          runsheets={(runsheets ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            timezone: r.timezone,
            start_date: r.start_date,
            end_date: r.end_date,
          }))}
          createErrorMessage={createErrorMessage}
          defaultStartUtc={defaultStartUtc}
          defaultEndUtc={defaultEndUtc}
        />
      </div>
    </div>
  );
}
