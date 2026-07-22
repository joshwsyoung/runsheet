import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import {
  Navigation,
  Ticket,
  Phone,
  ExternalLink,
  Pencil,
  Check,
  Square,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { activityMeta } from "@/lib/activity-types";
import { ActivityIcon } from "@/lib/activity-icons";
import { clampYmdToRange } from "@/lib/dates";
import {
  slotHm,
  bulletsFromRow,
  slotTodoItemsFromRow,
  slotSpansNextCalendarDay,
  slotDurationLabel,
} from "@/lib/slot-display";
import { linesFromSlotTodos } from "@/lib/slot-todos";
import { slotActions, attachmentUrlsOf } from "@/lib/slot-actions";
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

/** A labelled row. Renders nothing when there is no value — no "—" filler. */
function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value || !value.trim()) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rs-border py-2 last:border-b-0">
      <dt className="shrink-0 text-[0.7rem] font-bold uppercase tracking-wide text-rs-label">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-right text-[0.85rem] text-rs-text">{value}</dd>
    </div>
  );
}

/** A card of rows. Renders nothing when every row inside is empty. */
function Section({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value?: string | null }[];
}) {
  const populated = rows.filter((r) => r.value && r.value.trim());
  if (populated.length === 0) return null;
  return (
    <section className="rounded-[14px] border border-rs-border bg-rs-surface px-3 py-1">
      <h2 className="pt-2 text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
        {title}
      </h2>
      <dl className="mt-1">
        {populated.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </dl>
    </section>
  );
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; slotId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id: runsheetId, slotId } = await params;
  const { edit } = await searchParams;
  const editing = edit === "1";

  const supabase = await createClient();
  const { data: slot } = await supabase.from("slots").select("*").eq("id", slotId).maybeSingle();
  if (!slot) notFound();
  const s = slot as SlotRow;

  const [{ data: day }, { data: rs }] = await Promise.all([
    supabase.from("runsheet_days").select("*").eq("id", s.day_id).maybeSingle(),
    supabase
      .from("runsheets")
      .select("id, title, timezone, start_date, end_date")
      .eq("id", runsheetId)
      .maybeSingle(),
  ]);
  if (!day) notFound();
  const d = day as DayRow;
  if (d.runsheet_id !== runsheetId) notFound();
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
  const flightMeta =
    s.flight_meta && typeof s.flight_meta === "object" && !Array.isArray(s.flight_meta)
      ? (s.flight_meta as Record<string, string>)
      : {};
  const attachments = attachmentUrlsOf(s);
  const actions = slotActions(s);
  const backHref = `/runsheet/${runsheetId}?day=${dayYmd}`;

  const airports =
    flightMeta.departureAirport || flightMeta.arrivalAirport
      ? `${flightMeta.departureAirport ?? "?"} → ${flightMeta.arrivalAirport ?? "?"}`
      : null;
  const terminals =
    flightMeta.departureTerminal || flightMeta.arrivalTerminal
      ? `${flightMeta.departureTerminal ?? "?"} → ${flightMeta.arrivalTerminal ?? "?"}`
      : null;

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-12 sm:p-2.5">
      <div className="w-full max-w-[450px]">
        {/* Type band — colour and icon carry the activity type. */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{
            background: `linear-gradient(135deg, ${meta.border}22, var(--color-rs-surface))`,
          }}
        >
          <ActivityIcon type={s.activity_type} className="h-4 w-4" color={meta.border} />
          <span className="text-[0.68rem] font-bold uppercase tracking-wide text-rs-secondary">
            {meta.label}
          </span>
          <span className="ml-auto">
            {editing ? (
              <Link
                href={`/runsheet/${runsheetId}/activity/${slotId}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rs-border bg-rs-surface px-3 text-[0.75rem] font-bold text-rs-secondary no-underline"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Cancel
              </Link>
            ) : (
              <Link
                href={`/runsheet/${runsheetId}/activity/${slotId}?edit=1`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rs-border bg-rs-surface px-3 text-[0.75rem] font-bold text-rs-secondary no-underline"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </Link>
            )}
          </span>
        </div>

        <div className="space-y-3 px-3 pb-6 pt-3">
          <header>
            <h1 className="text-[1.2rem] font-bold leading-snug text-rs-text">
              {s.title ?? "Untitled"}
            </h1>
            <p className="mt-1 text-[0.8rem] text-rs-muted">
              {DateTime.fromISO(dayYmd, { zone: tz }).toFormat("cccc d MMM")}
              <span className="px-1.5 text-rs-label">·</span>
              <span className="font-bold tabular-nums text-rs-secondary">
                {startHm}
                {s.open_ended ? " → open" : `–${slotHm(s.end_at, tz)}`}
                {overnight ? " (+1)" : ""}
              </span>
              {s.open_ended ? null : (
                <>
                  <span className="px-1.5 text-rs-label">·</span>
                  {slotDurationLabel(s.start_at, s.end_at, tz, s.open_ended)}
                </>
              )}
            </p>
          </header>

          {!editing && actions.length ? (
            <div className="grid grid-cols-2 gap-2">
              {actions.map((a) => {
                const Icon =
                  a.kind === "directions"
                    ? Navigation
                    : a.kind === "ticket"
                      ? Ticket
                      : a.kind === "call"
                        ? Phone
                        : ExternalLink;
                const cls =
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rs-border bg-rs-surface text-[0.8rem] font-bold text-rs-primary no-underline";
                if (!a.href) return null;
                return a.external ? (
                  <a key={a.kind} href={a.href} target="_blank" rel="noreferrer" className={cls}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {a.label}
                  </a>
                ) : (
                  <a key={a.kind} href={a.href} className={cls}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {a.label}
                  </a>
                );
              })}
            </div>
          ) : null}

          {editing ? (
            <>
              <form
                action={updateSlotFromForm}
                className="space-y-3 rounded-[14px] border border-rs-border bg-rs-surface p-3"
              >
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
                  defaultFlightMeta={flightMeta}
                />
                <label className="flex items-center gap-2 text-sm font-bold text-rs-secondary">
                  <input type="checkbox" name="open_end" defaultChecked={s.open_ended} />
                  Open end
                </label>
                {[
                  { name: "description", label: "About", rows: 3, value: s.description ?? "" },
                  {
                    name: "todos",
                    label: "To-dos (one per line)",
                    rows: 3,
                    value: linesFromSlotTodos(todoItems),
                  },
                  {
                    name: "bullets",
                    label: "Bullets (one per line)",
                    rows: 3,
                    value: bullets.join("\n"),
                  },
                  {
                    name: "attachment_urls",
                    label: "Passes / QR links (one per line)",
                    rows: 2,
                    value: attachments.join("\n"),
                  },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                      {f.label}
                    </label>
                    <textarea
                      name={f.name}
                      rows={f.rows}
                      defaultValue={f.value}
                      className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                {[
                  { name: "link_url", label: "Link", value: s.link_url ?? "", type: "url" },
                  {
                    name: "booking_ref",
                    label: "Booking ref",
                    value: s.booking_ref ?? "",
                    type: "text",
                  },
                  {
                    name: "contact_info",
                    label: "Contact",
                    value: s.contact_info ?? "",
                    type: "text",
                  },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                      {f.label}
                    </label>
                    <input
                      name={f.name}
                      type={f.type}
                      defaultValue={f.value}
                      className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-rs-primary py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
                >
                  Save changes
                </button>
              </form>

              <form action={deleteSlotFromForm}>
                <input type="hidden" name="runsheet_id" value={runsheetId} />
                <input type="hidden" name="slot_id" value={slotId} />
                <button type="submit" className="rs-btn rs-btn-danger w-full">
                  Delete this slot
                </button>
              </form>
            </>
          ) : (
            <>
              {s.description || bullets.length ? (
                <section className="rounded-[14px] border border-rs-border bg-rs-surface p-3">
                  {s.description ? (
                    <>
                      <h2 className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                        About
                      </h2>
                      <p className="mt-1.5 text-[0.85rem] leading-relaxed text-rs-secondary">
                        {s.description}
                      </p>
                    </>
                  ) : null}
                  {bullets.length ? (
                    <ul
                      className={`space-y-1 border-l-2 pl-3 text-[0.82rem] leading-relaxed text-rs-muted ${
                        s.description ? "mt-2.5" : ""
                      }`}
                      style={{ borderColor: meta.border }}
                    >
                      {bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}

              <Section
                title="Journey"
                rows={[
                  { label: "From", value: s.from_location },
                  { label: "To", value: s.to_location },
                  { label: "Flight", value: s.flight_number },
                  { label: "Place", value: s.location_name },
                ]}
              />

              <Section
                title="Flight details"
                rows={
                  s.activity_type === "flight"
                    ? [
                        { label: "Airline", value: flightMeta.airline },
                        { label: "Airports", value: airports },
                        { label: "Terminals", value: terminals },
                        { label: "Seat", value: flightMeta.seat },
                        { label: "Gate", value: flightMeta.gate },
                        { label: "Boarding", value: flightMeta.boardingTime },
                      ]
                    : []
                }
              />

              <Section
                title="Booking"
                rows={[
                  { label: "Reference", value: s.booking_ref },
                  { label: "Contact", value: s.contact_info },
                ]}
              />

              <section className="rounded-[14px] border border-rs-border bg-rs-surface p-3">
                <h2 className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                  To-dos
                </h2>
                {todoItems.length ? (
                  <ul className="mt-2 space-y-2 text-[0.85rem]">
                    {todoItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-rs-secondary">
                        <form action={toggleSlotTodoItem} className="inline shrink-0">
                          <input type="hidden" name="runsheet_id" value={runsheetId} />
                          <input type="hidden" name="slot_id" value={slotId} />
                          <input type="hidden" name="todo_id" value={item.id} />
                          <input type="hidden" name="done" value={item.done ? "false" : "true"} />
                          <button
                            type="submit"
                            className="mt-0.5 text-rs-muted"
                            aria-label={item.done ? "Mark not done" : "Mark done"}
                          >
                            {item.done ? (
                              <Check className="h-4 w-4" aria-hidden />
                            ) : (
                              <Square className="h-4 w-4" aria-hidden />
                            )}
                          </button>
                        </form>
                        <span className={item.done ? "text-rs-label line-through" : ""}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[0.8rem] text-rs-label">Nothing to do.</p>
                )}
                <form action={addSlotTodoFromForm} className="mt-3 flex gap-2">
                  <input type="hidden" name="runsheet_id" value={runsheetId} />
                  <input type="hidden" name="slot_id" value={slotId} />
                  <input
                    name="text"
                    placeholder="Add a to-do"
                    className="min-w-0 flex-1 rounded-xl border border-rs-border px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-rs-primary px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </form>
              </section>

              {attachments.length ? (
                <section className="rounded-[14px] border border-rs-border bg-rs-surface p-3">
                  <h2 className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    Passes
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-[0.82rem]">
                    {attachments.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 break-all text-rs-primary underline"
                        >
                          <Ticket className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {s.link_url ? (
                <section className="rounded-[14px] border border-rs-border bg-rs-surface p-3">
                  <h2 className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    Link
                  </h2>
                  <a
                    className="mt-1.5 block truncate text-[0.85rem] font-bold text-rs-primary underline"
                    href={s.link_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.preview_title ?? s.link_url}
                  </a>
                  {s.preview_description ? (
                    <p className="mt-1.5 text-[0.8rem] leading-relaxed text-rs-muted">
                      {s.preview_description}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    <LinkPreviewButton slotId={slotId} />
                  </div>
                </section>
              ) : null}

              <Link
                href={backHref}
                className="block rounded-xl border border-rs-border bg-rs-surface py-2.5 text-center text-[0.8rem] font-bold text-rs-secondary no-underline"
              >
                Back to the day
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
