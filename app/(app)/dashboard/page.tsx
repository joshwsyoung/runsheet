import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRunsheet, archiveRunsheet } from "@/app/actions/runsheets";
import { signOut } from "@/app/actions/auth";

const CREATE_ERROR_COPY: Record<string, string> = {
  "missing-title": "Add a title before creating a runsheet.",
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
    .select("id, title, timezone, created_at, archived_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-dvh justify-center bg-[#fcfcfc] p-0 pb-16 sm:p-2.5">
      <div className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-none border-0 border-transparent bg-white shadow-none sm:rounded-[24px] sm:border sm:border-[#eeeeee] sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <header className="flex items-center justify-between border-b border-[#eeeeee] px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-[#333]">Runsheets</h1>
            <p className="text-[0.72rem] font-bold uppercase tracking-wide text-[#999]">
              Signed in
            </p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl border border-[#eeeeee] bg-white px-3 py-1.5 text-xs font-bold text-[#555]"
            >
              Sign out
            </button>
          </form>
        </header>

        <div className="space-y-3 p-4">
          <form action={createRunsheet} className="rs-card space-y-3">
            {createErrorMessage ? (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {createErrorMessage}
              </p>
            ) : null}
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              New runsheet
            </p>
            <input
              name="title"
              placeholder="Title (e.g. Greece 2026)"
              required
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#4a90e2]"
            />
            <input type="hidden" name="timezone" value="UTC" />
            <button
              type="submit"
              className="w-full rounded-xl bg-[#4a90e2] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
            >
              Create
            </button>
          </form>

          <div className="pt-2">
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Yours
            </p>
            <div className="space-y-2">
              {(runsheets ?? []).length === 0 ? (
                <p className="text-sm text-[#666]">No runsheets yet — create one above.</p>
              ) : (
                (runsheets ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-stretch overflow-hidden rounded-[14px] border border-[#eeeeee] bg-white shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
                  >
                    <div className="w-1.5 shrink-0 bg-[#4a90e2]" aria-hidden />
                    <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                      <Link
                        href={`/runsheet/${r.id}`}
                        className="truncate text-[0.95rem] font-bold text-[#333] no-underline hover:text-[#4a90e2]"
                      >
                        {r.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#eef6ff] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[#4a90e2]">
                          {r.timezone}
                        </span>
                      </div>
                    </div>
                    <form action={archiveRunsheet} className="shrink-0 p-2">
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-[0.65rem] font-bold text-[#999] hover:bg-[#fafafa]"
                        title="Archive"
                      >
                        Archive
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
