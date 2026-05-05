import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";
import { ACTIVITY_TYPES, activityMeta } from "@/lib/activity-types";
import { clampYmdToRange } from "@/lib/dates";
import { slotHm, bulletsFromRow, todosFromRow, slotSpansNextCalendarDay } from "@/lib/slot-display";
import {
  updateSlotFromForm,
  deleteSlotFromForm,
} from "@/app/actions/slots";
import { LinkPreviewButton } from "@/components/link-preview-button";
import type { Database } from "@/lib/database.types";

type SlotRow = Database["public"]["Tables"]["slots"]["Row"];
type DayRow = Database["public"]["Tables"]["runsheet_days"]["Row"];

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string; slotId: string }>;
}) {
  const { id: runsheetId, slotId } = await params;
  const supabase = await createClient();
  const { data: slot } = await supabase.from("slots").select("*").eq("id", slotId).maybeSingle();
  if (!slot) notFound();
  const s = slot as SlotRow;

  const { data: day } = await supabase
    .from("runsheet_days")
    .select("*")
    .eq("id", s.day_id)
    .maybeSingle();
  if (!day) notFound();
  const d = day as DayRow;
  if (d.runsheet_id !== runsheetId) notFound();

  const { data: rs } = await supabase
    .from("runsheets")
    .select("id, title, timezone, start_date, end_date")
    .eq("id", runsheetId)
    .maybeSingle();
  if (!rs) notFound();

  const tz = rs.timezone || "UTC";
  const dayYmd = d.day_date;
  const meta = activityMeta(s.activity_type);
  const bullets = bulletsFromRow(s);
  const todos = todosFromRow(s);
  const startHm = slotHm(s.start_at, tz);
  const endHm = s.open_ended ? "" : slotHm(s.end_at, tz);
  const overnight = slotSpansNextCalendarDay(s.start_at, s.end_at, tz, s.open_ended);
  const dayEditDefault = clampYmdToRange(dayYmd, rs.start_date, rs.end_date, tz);

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-10 print:pb-4 sm:p-2.5">
      <div className="w-full max-w-[450px] space-y-3 pt-0 sm:pt-3">
        <header className="flex items-center justify-between">
          <Link
            href={`/runsheet/${runsheetId}?day=${dayYmd}`}
            className="text-sm font-bold text-rs-subtle no-underline hover:text-rs-primary"
          >
            ← Close
          </Link>
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
            Activity
          </span>
        </header>

        <div className="overflow-hidden rounded-none border-0 bg-rs-surface shadow-none sm:rounded-[24px] sm:border sm:border-rs-border sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_12px_48px_rgba(0,0,0,0.55)]">
          <div
            className="h-28 w-full bg-cover bg-center"
            style={
              s.preview_image_url
                ? { backgroundImage: `url(${s.preview_image_url})` }
                : {
                    background: `linear-gradient(135deg, ${meta.border}22, var(--color-rs-surface))`,
                  }
            }
          />
          <div className="space-y-3 px-4 pb-4 pt-3">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: meta.border }}
              >
                {meta.label}
              </span>
            </div>
            <h1 className="text-[1.15rem] font-bold leading-snug text-rs-text">
              {s.title ?? "Untitled"}
            </h1>
            <p className="text-[0.85rem] font-bold text-rs-secondary">
              <span className="font-normal text-rs-label">
                {DateTime.fromISO(dayYmd, { zone: tz }).toFormat("EEE d MMM")}
                <span className="px-1">·</span>
              </span>
              {startHm}
              <span className="px-1 text-rs-label">·</span>
              {s.open_ended ? "open end" : `${slotHm(s.end_at, tz)}${overnight ? " (next day)" : ""}`}
            </p>

            {s.link_url ? (
              <div className="rounded-xl border border-rs-border bg-rs-muted-surface p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                  Link
                </p>
                <a
                  className="mt-1 block truncate text-sm font-bold text-rs-primary underline"
                  href={s.link_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.preview_title ?? s.link_url}
                </a>
                {s.preview_description ? (
                  <p className="mt-2 text-xs leading-relaxed text-rs-muted">{s.preview_description}</p>
                ) : null}
                <div className="no-print mt-2">
                  <LinkPreviewButton slotId={slotId} />
                </div>
              </div>
            ) : null}

            {s.description ? (
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">About</p>
                <p className="mt-1 text-sm leading-relaxed text-rs-secondary">{s.description}</p>
              </div>
            ) : null}

            {bullets.length ? (
              <ul className="space-y-1 border-l-2 pl-3 text-sm text-rs-muted" style={{ borderColor: "#4a90e2" }}>
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}

            {todos.length ? (
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">To-dos</p>
                <ul className="mt-1 space-y-1 border-l-2 border-amber-400 pl-3 text-sm text-rs-secondary">
                  {todos.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <dl className="grid grid-cols-[1fr_2fr] gap-x-2 gap-y-2 text-sm">
              <dt className="font-bold text-rs-label">Booking</dt>
              <dd className="text-rs-text">{s.booking_ref ?? "—"}</dd>
              <dt className="font-bold text-rs-label">Contact</dt>
              <dd className="text-rs-text">{s.contact_info ?? "—"}</dd>
            </dl>

            <details className="no-print rounded-xl border border-rs-border bg-rs-muted-surface p-3">
              <summary className="cursor-pointer text-sm font-bold text-rs-text">Adjust…</summary>
              <form action={updateSlotFromForm} className="mt-3 space-y-3">
                <input type="hidden" name="runsheet_id" value={runsheetId} />
                <input type="hidden" name="slot_id" value={slotId} />
                <input type="hidden" name="timezone" value={tz} />
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    Title
                  </label>
                  <input
                    name="title"
                    defaultValue={s.title ?? ""}
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    Type
                  </label>
                  <select
                    name="activity_type"
                    defaultValue={s.activity_type}
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
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
                      <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label/80">
                        Day
                      </label>
                      <input
                        type="date"
                        name="day_ymd"
                        required
                        min={rs.start_date}
                        max={rs.end_date}
                        defaultValue={dayEditDefault}
                        className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label/80">
                        Start
                      </label>
                      <input
                        name="start_hm"
                        type="time"
                        defaultValue={startHm}
                        className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label/80">
                        End
                      </label>
                      <input
                        name="end_hm"
                        type="time"
                        defaultValue={endHm}
                        className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[0.72rem] leading-snug text-rs-muted">
                    Overnight: end earlier on the clock than start (e.g. 22:00–02:00).
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-rs-secondary">
                  <input type="checkbox" name="open_end" defaultChecked={s.open_ended} />
                  Open end
                </label>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    About
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={s.description ?? ""}
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    To-dos (one per line)
                  </label>
                  <textarea
                    name="todos"
                    rows={3}
                    defaultValue={todos.join("\n")}
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
                    defaultValue={bullets.join("\n")}
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
                    defaultValue={s.link_url ?? ""}
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    Booking ref
                  </label>
                  <input
                    name="booking_ref"
                    defaultValue={s.booking_ref ?? ""}
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    Contact
                  </label>
                  <input
                    name="contact_info"
                    defaultValue={s.contact_info ?? ""}
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-rs-primary py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
                >
                  Save
                </button>
              </form>
            </details>

            <form action={deleteSlotFromForm} className="no-print pt-2">
              <input type="hidden" name="runsheet_id" value={runsheetId} />
              <input type="hidden" name="slot_id" value={slotId} />
              <button
                type="submit"
                className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-bold text-red-800"
              >
                Delete slot
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
