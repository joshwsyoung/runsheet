import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateTime } from "luxon";
import { MapPin, Trash2, HelpCircle, CalendarPlus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/cached-session";
import { addIdea, deleteIdea, scheduleIdea, toggleIdeaUnconfirmed } from "@/app/actions/ideas";
import { eachYmdInclusive } from "@/lib/dates";
import { mapsSearchUrl } from "@/lib/places";
import { dayStatusMeta } from "@/lib/day-status";
import { groupIdeasByCategory, IDEA_CATEGORIES, ideaCategoryMeta } from "@/lib/trip-ideas";
import type { Database } from "@/lib/database.types";

type IdeaRow = Database["public"]["Tables"]["trip_ideas"]["Row"];
type DayRow = Database["public"]["Tables"]["runsheet_days"]["Row"];

export default async function IdeasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: runsheet, error: rsErr } = await supabase
    .from("runsheets")
    .select("id, title, timezone, start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  if (rsErr || !runsheet) notFound();

  const tz = runsheet.timezone || "UTC";

  const [ideasRes, daysRes] = await Promise.all([
    supabase
      .from("trip_ideas")
      .select("*")
      .eq("runsheet_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("runsheet_days")
      .select("id, day_date, label, is_special, status")
      .eq("runsheet_id", id)
      .order("day_date", { ascending: true }),
  ]);

  // Both reads depend on 20260722100000_day_status_and_trip_ideas.sql. If it has not
  // been run yet, say so plainly rather than rendering a confusing empty page.
  const migrationMissing = Boolean(ideasRes.error);
  const ideas = (ideasRes.data ?? []) as IdeaRow[];
  const dayRows = (daysRes.data ?? []) as DayRow[];
  const statusByYmd = Object.fromEntries(dayRows.map((d) => [d.day_date, d.status]));

  const tripDays = eachYmdInclusive(runsheet.start_date, runsheet.end_date, tz);
  const groups = groupIdeasByCategory(ideas);
  const unconfirmedCount = ideas.filter((i) => i.unconfirmed).length;

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-28 font-sans text-rs-text antialiased sm:p-2.5">
      <div className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-none border-0 bg-rs-surface sm:rounded-[24px] sm:border sm:border-rs-border sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3 border-b border-rs-border px-4 py-5">
          <div className="min-w-0">
            <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              {runsheet.title}
            </span>
            <h1 className="mt-0.5 text-[1.1rem] font-bold leading-snug">Ideas</h1>
            <p className="mt-1 text-[0.8rem] text-rs-muted">
              {ideas.length} place{ideas.length === 1 ? "" : "s"} with no day yet
              {unconfirmedCount > 0 ? ` · ${unconfirmedCount} unconfirmed` : ""}
            </p>
          </div>
          <Link
            href={`/runsheet/${id}`}
            className="shrink-0 pt-0.5 text-[0.72rem] font-bold text-rs-primary no-underline"
          >
            ← Runsheet
          </Link>
        </div>

        {migrationMissing ? (
          <p className="flex items-start gap-2 border-b border-rs-border bg-amber-50 px-4 py-3 text-[0.78rem] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              The ideas table is not in the database yet. Run{" "}
              <code>supabase/migrations/20260722100000_day_status_and_trip_ideas.sql</code>{" "}
              in the Supabase SQL editor, then reload.
            </span>
          </p>
        ) : null}

        {unconfirmedCount > 0 ? (
          <p className="flex items-start gap-2 border-b border-rs-border bg-rs-muted-surface px-4 py-3 text-[0.75rem] text-rs-muted">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Anything marked <b>unconfirmed</b> came off the voice note with the name
              unclear. The map link is a search, not a pin. Tap the badge once you have
              nailed the name down.
            </span>
          </p>
        ) : null}

        <div className="flex-1 px-[15px] py-4">
          {groups.length === 0 ? (
            <p className="py-6 text-center text-[0.85rem] text-rs-label">
              No ideas yet. Add one below.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.category} className="mb-6">
                <h2 className="mb-2 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-wide text-rs-label">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: group.accent }}
                  />
                  {group.label}
                </h2>

                <div className="space-y-2">
                  {group.items.map((idea) => (
                    <div
                      key={idea.id}
                      className="overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
                    >
                      {idea.image_url ? (
                        <div
                          className="h-28 w-full bg-rs-fill bg-cover bg-center"
                          style={{ backgroundImage: `url(${idea.image_url})` }}
                          role="img"
                          aria-label={idea.text}
                        />
                      ) : null}
                      <div
                        className="border-l-[4px] px-3 py-2.5"
                        style={{ borderColor: group.accent }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[0.88rem] font-bold leading-snug">{idea.text}</p>
                          <form action={toggleIdeaUnconfirmed} className="shrink-0">
                            <input type="hidden" name="runsheet_id" value={id} />
                            <input type="hidden" name="idea_id" value={idea.id} />
                            <input
                              type="hidden"
                              name="unconfirmed"
                              value={idea.unconfirmed ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              title={
                                idea.unconfirmed
                                  ? "Mark the name as confirmed"
                                  : "Flag the name as unconfirmed"
                              }
                              className={`rounded-full px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wide ${
                                idea.unconfirmed
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                                  : "bg-rs-fill text-rs-label"
                              }`}
                            >
                              {idea.unconfirmed ? "Unconfirmed" : "Confirmed"}
                            </button>
                          </form>
                        </div>
                        {idea.note ? (
                          <p className="mt-1 text-[0.76rem] leading-relaxed text-rs-muted">
                            {idea.note}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-stretch border-t border-rs-border">
                        {idea.place ? (
                          <a
                            href={mapsSearchUrl(idea.place)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-[0.72rem] font-bold text-rs-primary no-underline"
                          >
                            <MapPin className="h-3.5 w-3.5" aria-hidden />
                            Maps
                          </a>
                        ) : null}
                        <form
                          action={deleteIdea}
                          className="flex border-l border-rs-border"
                        >
                          <input type="hidden" name="runsheet_id" value={id} />
                          <input type="hidden" name="idea_id" value={idea.id} />
                          <button
                            type="submit"
                            aria-label={`Remove ${idea.text}`}
                            className="flex min-h-11 items-center justify-center px-4 text-rs-label"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </form>
                      </div>

                      <form
                        action={scheduleIdea}
                        className="flex items-center gap-2 border-t border-rs-border bg-rs-muted-surface px-3 py-2"
                      >
                        <input type="hidden" name="runsheet_id" value={id} />
                        <input type="hidden" name="idea_id" value={idea.id} />
                        <CalendarPlus className="h-3.5 w-3.5 shrink-0 text-rs-label" aria-hidden />
                        <select
                          name="day"
                          defaultValue=""
                          required
                          aria-label={`Day for ${idea.text}`}
                          className="min-h-9 min-w-0 flex-1 rounded-lg border border-rs-border bg-rs-surface px-2 py-1 text-[0.75rem]"
                        >
                          <option value="" disabled>
                            Put it on a day…
                          </option>
                          {tripDays.map((ymd) => {
                            const dt = DateTime.fromISO(ymd, { zone: tz });
                            const st = dayStatusMeta(statusByYmd[ymd]);
                            return (
                              <option key={ymd} value={ymd}>
                                {dt.toFormat("ccc d MMM")} · {st.short}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="submit"
                          className="min-h-9 shrink-0 rounded-lg bg-rs-primary px-3 text-[0.72rem] font-bold text-white"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}

          <details className="mt-2 rounded-[14px] border border-rs-border bg-rs-muted-surface px-3 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[0.8rem] font-bold text-rs-secondary">
              <Plus className="h-4 w-4" aria-hidden />
              Add an idea
            </summary>
            <form action={addIdea} className="mt-3 space-y-2">
              <input type="hidden" name="runsheet_id" value={id} />
              <input
                name="text"
                required
                placeholder="Name of the place"
                className="w-full rounded-xl border border-rs-border bg-rs-surface px-3 py-2 text-sm"
              />
              <select
                name="category"
                defaultValue="restaurant"
                aria-label="Category"
                className="w-full rounded-xl border border-rs-border bg-rs-surface px-3 py-2 text-sm"
              >
                {IDEA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ideaCategoryMeta(c).label}
                  </option>
                ))}
              </select>
              <input
                name="place"
                placeholder="Maps search (optional — defaults to the name)"
                className="w-full rounded-xl border border-rs-border bg-rs-surface px-3 py-2 text-sm"
              />
              <textarea
                name="note"
                rows={2}
                placeholder="Anything worth remembering"
                className="w-full rounded-xl border border-rs-border bg-rs-surface px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-[0.78rem] text-rs-muted">
                <input type="checkbox" name="unconfirmed" className="h-4 w-4" />
                Not sure about the name
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-rs-primary px-3 py-2.5 text-sm font-bold text-white"
              >
                Add to ideas
              </button>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}
