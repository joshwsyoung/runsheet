import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DateTime } from "luxon";
import { activityMeta } from "@/lib/activity-types";
import { clampYmdToRange } from "@/lib/dates";
import { slotHm, bulletsFromRow, slotTodoItemsFromRow, slotSpansNextCalendarDay } from "@/lib/slot-display";
import { linesFromSlotTodos } from "@/lib/slot-todos";
import {
  updateSlotFromForm,
  deleteSlotFromForm,
  toggleSlotTodoItem,
  addSlotTodoFromForm,
} from "@/app/actions/slots";
import { LinkPreviewButton } from "@/components/link-preview-button";
import { SlotCoreFields } from "@/components/slot-core-fields";
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
  const todoItems = slotTodoItemsFromRow(s);
  const startHm = slotHm(s.start_at, tz);
  const endHm = s.open_ended ? "" : slotHm(s.end_at, tz);
  const overnight = slotSpansNextCalendarDay(s.start_at, s.end_at, tz, s.open_ended);
  const dayEditDefault = clampYmdToRange(dayYmd, rs.start_date, rs.end_date, tz);
  const localStart = DateTime.fromISO(s.start_at, { zone: "utc" }).setZone(tz);
  const localEnd = DateTime.fromISO(s.end_at, { zone: "utc" }).setZone(tz);
  const startDayYmd = localStart.toISODate() ?? dayEditDefault;
  const endDayYmd = localEnd.toISODate() ?? dayEditDefault;

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
          <div className="flex items-center gap-2">
            <a
              href="#edit-slot"
              className="no-print rounded-lg p-1.5 text-rs-label no-underline hover:bg-rs-muted-surface hover:text-rs-text"
              aria-label="Edit slot"
              title="Edit slot"
            >
              ⚙
            </a>
            <span className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Activity
            </span>
          </div>
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
            <div className="flex items-center justify-between gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: meta.border }}
              >
                {meta.label}
              </span>
              <span className="no-print text-sm text-rs-label">✎ Edit below</span>
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

            <div className="rounded-xl border border-amber-400/35 bg-rs-muted-surface/50 p-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">To-dos</p>
              {todoItems.length ? (
                <ul className="mt-2 space-y-2 border-l-2 border-amber-400 pl-3 text-sm">
                  {todoItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-rs-secondary">
                      <form action={toggleSlotTodoItem} className="no-print inline shrink-0">
                        <input type="hidden" name="runsheet_id" value={runsheetId} />
                        <input type="hidden" name="slot_id" value={slotId} />
                        <input type="hidden" name="todo_id" value={item.id} />
                        <input type="hidden" name="done" value={item.done ? "false" : "true"} />
                        <button
                          type="submit"
                          className="font-[inherit] leading-none text-rs-muted"
                          aria-label={item.done ? "Mark not done" : "Mark done"}
                        >
                          {item.done ? "☑" : "☐"}
                        </button>
                      </form>
                      <span className={item.done ? "text-rs-label line-through" : ""}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-rs-label">None yet — add below or from the trips list.</p>
              )}
              <form action={addSlotTodoFromForm} className="no-print mt-3 flex gap-2">
                <input type="hidden" name="runsheet_id" value={runsheetId} />
                <input type="hidden" name="slot_id" value={slotId} />
                <input
                  name="text"
                  placeholder="Add a to-do"
                  className="min-w-0 flex-1 rounded-xl border border-rs-border px-2 py-1.5 text-sm"
                />
                <button type="submit" className="rounded-xl bg-rs-primary px-3 py-1.5 text-xs font-bold text-white">
                  Add
                </button>
              </form>
            </div>

            <dl className="grid grid-cols-[1fr_2fr] gap-x-2 gap-y-2 text-sm">
              <dt className="font-bold text-rs-label">From</dt>
              <dd className="text-rs-text">{s.from_location ?? "—"}</dd>
              <dt className="font-bold text-rs-label">To</dt>
              <dd className="text-rs-text">{s.to_location ?? "—"}</dd>
              <dt className="font-bold text-rs-label">Flight no.</dt>
              <dd className="text-rs-text">{s.flight_number ?? "—"}</dd>
              <dt className="font-bold text-rs-label">Booking</dt>
              <dd className="text-rs-text">{s.booking_ref ?? "—"}</dd>
              <dt className="font-bold text-rs-label">Contact</dt>
              <dd className="text-rs-text">{s.contact_info ?? "—"}</dd>
            </dl>

            {s.map_url ? (
              <a
                href={s.map_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl border border-rs-border bg-rs-muted-surface px-3 py-2 text-sm font-bold text-rs-primary no-underline"
              >
                Open map
              </a>
            ) : null}

            <details id="edit-slot" className="no-print rounded-xl border border-rs-border bg-rs-muted-surface p-3">
              <summary className="cursor-pointer text-sm font-bold text-rs-text">Adjust…</summary>
              <form action={updateSlotFromForm} className="mt-3 space-y-3">
                <input type="hidden" name="runsheet_id" value={runsheetId} />
                <input type="hidden" name="slot_id" value={slotId} />
                <input type="hidden" name="timezone" value={tz} />
                <SlotCoreFields
                  startDateMin={rs.start_date}
                  endDateMax={rs.end_date}
                  defaultStartDayYmd={startDayYmd}
                  defaultEndDayYmd={endDayYmd}
                  defaultStartHm={startHm}
                  defaultEndHm={endHm}
                  defaultType={s.activity_type}
                  defaultTitle={s.title}
                  defaultFromLocation={s.from_location}
                  defaultToLocation={s.to_location}
                  defaultFlightNumber={s.flight_number}
                  defaultLocationName={s.location_name}
                  defaultMapUrl={s.map_url}
                />
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
                    defaultValue={linesFromSlotTodos(todoItems)}
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
                className="rs-btn rs-btn-danger w-full"
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
