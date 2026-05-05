import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { clampYmdToRange, todayYmdInTz } from "@/lib/dates";
import { createSlotFromForm } from "@/app/actions/slots";
import { ACTIVITY_TYPES, activityMeta } from "@/lib/activity-types";

export default async function NewSlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { id } = await params;
  const { day: dayParam } = await searchParams;
  const supabase = await createClient();
  const { data: rs } = await supabase
    .from("runsheets")
    .select("id, title, timezone, start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  if (!rs) notFound();
  const tz = rs.timezone || "UTC";
  const requestedDay =
    dayParam && dayParam.length >= 8 ? dayParam : todayYmdInTz(tz);
  const defaultDayYmd = clampYmdToRange(
    requestedDay,
    rs.start_date,
    rs.end_date,
    tz,
  );
  const dayLabel = DateTime.fromISO(defaultDayYmd, { zone: tz }).toFormat("ccc d MMM yyyy");

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-10 sm:p-2.5">
      <div className="w-full max-w-[450px] space-y-4 pt-2 sm:pt-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/runsheet/${id}?day=${defaultDayYmd}`}
            className="text-sm font-bold text-rs-subtle no-underline hover:text-rs-primary"
          >
            ← Back
          </Link>
          <span className="text-xs font-bold uppercase tracking-wide text-rs-label">New slot</span>
        </div>
        <form action={createSlotFromForm} className="rs-card space-y-3">
          <input type="hidden" name="runsheet_id" value={id} />
          <input type="hidden" name="timezone" value={tz} />
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Title
            </label>
            <input
              name="title"
              required
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Type
            </label>
            <select
              name="activity_type"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              defaultValue="other"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {activityMeta(t).label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              When
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-end">
              <div>
                <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
                  Day
                </label>
                <input
                  type="date"
                  name="day_ymd"
                  required
                  min={rs.start_date}
                  max={rs.end_date}
                  defaultValue={defaultDayYmd}
                  className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
                  Start
                </label>
                <input
                  name="start_hm"
                  type="time"
                  defaultValue="09:00"
                  className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
                  End
                </label>
                <input
                  name="end_hm"
                  type="time"
                  className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm"
                />
              </div>
            </div>
            <p className="mt-1.5 text-[0.72rem] leading-snug text-rs-muted">
              Day defaults to the one you were viewing ({dayLabel}). If the block runs past midnight, set end earlier on
              the clock than start (e.g. 22:00–02:00) — we treat that as the next morning.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-rs-secondary">
            <input type="checkbox" name="open_end" className="h-4 w-4" />
            Open end
          </label>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              To-dos (one per line)
            </label>
            <textarea
              name="todos"
              rows={3}
              placeholder={"Book taxi\nFind a restaurant"}
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[0.72rem] text-rs-muted">Things still to sort before this activity is ready.</p>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              About
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Bullets (one per line)
            </label>
            <textarea
              name="bullets"
              rows={3}
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Link
            </label>
            <input
              name="link_url"
              type="url"
              placeholder="https://"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Booking ref
            </label>
            <input
              name="booking_ref"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Contact
            </label>
            <input
              name="contact_info"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-rs-primary py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
          >
            Save slot
          </button>
        </form>
      </div>
    </div>
  );
}
