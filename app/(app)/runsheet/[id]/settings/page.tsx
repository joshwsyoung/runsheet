import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/cached-session";
import { getAuthSiteUrl } from "@/lib/site-url";
import { inviteToRunsheet } from "@/app/actions/invites";
import { updateRunsheetSettings } from "@/app/actions/runsheets";
import { InviteShareLink } from "@/components/invite-share-link";
import type { Database } from "@/lib/database.types";

type InviteRow = Database["public"]["Tables"]["runsheet_invites"]["Row"];
type MemberRow = Database["public"]["Tables"]["runsheet_members"]["Row"];

const TRIP_ERROR_COPY: Record<string, string> = {
  "missing-trip-dates": "Start and end date are required.",
  "invalid-trip-dates": "End date must be on or after the start date.",
  "trip-update-failed": "Could not save trip dates. Try again.",
};

const BASICS_ERROR_COPY: Record<string, string> = {
  "missing-title": "Trip name is required.",
  "save-failed": "Could not save trip details. Try again.",
  "invite-missing-email": "Enter an email address to invite someone.",
  "invite-failed": "Could not create that invite. Try again.",
};

function roleRank(role: string): number {
  if (role === "owner") return 0;
  if (role === "editor") return 1;
  return 2;
}

export default async function RunsheetSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; invited?: string }>;
}) {
  const { id } = await params;
  const { error: errorCode, invited } = await searchParams;

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: runsheet, error: rsErr } = await supabase
    .from("runsheets")
    .select("id, title, owner_id, timezone, start_date, end_date, hero_image_url")
    .eq("id", id)
    .maybeSingle();

  if (rsErr || !runsheet) notFound();

  const isOwner = runsheet.owner_id === user.id;

  const [{ data: memberRow }, { data: membersRaw }] = await Promise.all([
    supabase
      .from("runsheet_members")
      .select("role")
      .eq("runsheet_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("runsheet_members").select("user_id, role, created_at").eq("runsheet_id", id),
  ]);

  const canEditSettings = isOwner || memberRow?.role === "editor";

  const members = ((membersRaw ?? []) as MemberRow[]).sort(
    (a, b) => roleRank(a.role) - roleRank(b.role),
  );

  let invites: InviteRow[] = [];
  if (isOwner) {
    const { data: invitesData } = await supabase
      .from("runsheet_invites")
      .select("*")
      .eq("runsheet_id", id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    invites = (invitesData ?? []) as InviteRow[];
  }

  // Absolute origin from the live request, so invite links always resolve even when
  // NEXT_PUBLIC_SITE_URL is not set.
  const origin = await getAuthSiteUrl();

  const tz = runsheet.timezone || "UTC";
  const tripStartFmt = DateTime.fromISO(runsheet.start_date, { zone: tz });
  const tripEndFmt = DateTime.fromISO(runsheet.end_date, { zone: tz });
  const tripRangeLabel =
    tripStartFmt.toFormat("d MMM yyyy") === tripEndFmt.toFormat("d MMM yyyy")
      ? tripStartFmt.toFormat("d MMM yyyy")
      : `${tripStartFmt.toFormat("d MMM yyyy")} – ${tripEndFmt.toFormat("d MMM yyyy")}`;

  const banner =
    BASICS_ERROR_COPY[errorCode ?? ""] ??
    TRIP_ERROR_COPY[errorCode ?? ""] ??
    (errorCode ? "Something went wrong. Try again." : null);

  function roleLabel(role: string): string {
    const r = role.charAt(0).toUpperCase() + role.slice(1);
    return r === "Viewer" ? "View only" : r === "Editor" ? "Can edit" : "Owner";
  }

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-10 pt-2 font-sans text-rs-text antialiased sm:p-2.5">
      <div className="w-full max-w-[450px] space-y-3">
        <div className="flex items-start justify-between gap-2 px-1">
          <div>
            <Link
              href={`/runsheet/${id}`}
              className="text-[0.8rem] font-bold text-rs-subtle no-underline hover:text-rs-primary"
            >
              ← Back to trip
            </Link>
            <h1 className="mt-2 text-[1.05rem] font-bold leading-snug">Trip settings</h1>
            <p className="mt-0.5 text-[0.72rem] text-rs-faint">{runsheet.title}</p>
          </div>
        </div>

        {banner ? (
          <div
            role="alert"
            className="rs-alert-danger text-center text-[0.8rem] font-bold"
          >
            {banner}
          </div>
        ) : null}

        <div className="rs-card mx-1 space-y-4 p-5">
          <section>
            <h2 className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">Summary</h2>
            <p className="mt-1 text-sm text-rs-secondary">{tripRangeLabel}</p>
            <p className="mt-1 text-[0.75rem] text-rs-faint">
              Timezone: <span className="font-mono text-rs-secondary">{tz}</span>
            </p>
          </section>

          {!canEditSettings ? (
            <p className="rounded-xl bg-rs-muted-surface px-3 py-2 text-[0.8rem] leading-relaxed text-rs-muted">
              Only owners and editors can change trip details. You can view who has access below.
            </p>
          ) : (
            <section className="border-t border-rs-border pt-4">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                Planner settings
              </h2>
              <form action={updateRunsheetSettings} className="mt-2 space-y-3">
                <input type="hidden" name="runsheet_id" value={id} />
                <label className="block">
                  <span className="mb-1 block text-[0.62rem] font-bold text-rs-label">Trip name</span>
                  <input
                    name="title"
                    required
                    defaultValue={runsheet.title}
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.62rem] font-bold text-rs-label">
                    Timezone (IANA)
                  </span>
                  <input
                    name="timezone"
                    defaultValue={tz}
                    placeholder="Europe/London"
                    className="w-full rounded-xl border border-rs-border px-3 py-2 font-mono text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.62rem] font-bold text-rs-label">Start date</span>
                    <input
                      type="date"
                      name="start_date"
                      required
                      defaultValue={runsheet.start_date}
                      className="rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.62rem] font-bold text-rs-label">End date</span>
                    <input
                      type="date"
                      name="end_date"
                      required
                      defaultValue={runsheet.end_date}
                      className="rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-[0.62rem] font-bold text-rs-label">Trip planner image URL</span>
                  <input
                    name="hero_image_url"
                    type="url"
                    defaultValue={runsheet.hero_image_url ?? ""}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </label>
                <button type="submit" className="rs-btn rs-btn-primary w-full">
                  Save
                </button>
              </form>
            </section>
          )}
        </div>

        <div className="rs-card mx-1 space-y-3 p-4">
          <h2 className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
            People with access
          </h2>
          <ul className="space-y-2 text-[0.85rem] text-rs-text">
            {members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-rs-muted-surface px-3 py-2">
                <span className="font-mono text-[0.72rem] text-rs-secondary">
                  {m.user_id.slice(0, 8)}…
                  {m.user_id === user.id ? (
                    <span className="ml-2 font-bold text-rs-primary">You</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[0.72rem] font-bold uppercase tracking-wide text-rs-label">
                  {roleLabel(m.role)}
                </span>
              </li>
            ))}
          </ul>

          {!isOwner ? (
            <p className="text-[0.75rem] text-rs-faint">
              Pending invites can only be created or viewed by the trip owner.
            </p>
          ) : (
            <div id="invite">
              <h3 className="border-t border-rs-border pt-3 text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                Invite someone
              </h3>
              <p className="mt-1 text-[0.72rem] leading-snug text-rs-muted">
                Create a link and send it to them yourself (text, WhatsApp, email — whatever). They
                sign in with the address you invite and get access.
              </p>
              {invited ? (
                <p className="mt-2 rounded-xl bg-rs-today px-3 py-2 text-[0.75rem] font-bold text-rs-primary">
                  Invite ready for {invited} — copy the link below and send it over.
                </p>
              ) : null}
              <form action={inviteToRunsheet} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="runsheet_id" value={id} />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="partner@email.com"
                  className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                />
                <select
                  name="role"
                  className="rounded-xl border border-rs-border px-3 py-2 text-sm"
                  defaultValue="editor"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">View only</option>
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-rs-primary py-2 text-sm font-bold text-white"
                >
                  Create invite link
                </button>
              </form>
              {invites.length ? (
                <ul className="mt-3 space-y-2 border-t border-rs-border pt-3">
                  {invites.map((inv) => (
                    <li key={inv.id} className="space-y-1">
                      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-rs-label">
                        {inv.email}
                        <span className="ml-2 font-normal normal-case text-rs-faint">
                          {inv.role === "viewer" ? "View only" : "Can edit"}
                        </span>
                      </p>
                      <InviteShareLink
                        url={`${origin}/invite/${inv.token}`}
                        email={inv.email}
                        tripTitle={runsheet.title}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 border-t border-rs-border pt-3 text-[0.72rem] text-rs-label">
                  No pending invites yet.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="px-4 text-center text-[0.65rem] text-rs-label">
          <Link href={`/runsheet/${id}`} className="font-bold text-rs-primary no-underline hover:underline">
            Return to itinerary
          </Link>
        </p>
      </div>
    </div>
  );
}
