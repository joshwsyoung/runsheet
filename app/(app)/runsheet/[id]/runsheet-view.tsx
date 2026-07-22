import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { Plus, Lightbulb, MapPin, AlertTriangle, Check, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/cached-session";
import { ensureRunsheetDays } from "@/app/actions/days";
import { toggleChecklistItem, addChecklistItem } from "@/app/actions/checklist";
import { toggleSlotTodoItem } from "@/app/actions/slots";
import { activityMeta } from "@/lib/activity-types";
import { ActivityIcon } from "@/lib/activity-icons";
import { dayStatusMeta, isOverBudget, LIGHT_DAY_SLOT_BUDGET } from "@/lib/day-status";
import { placeLink } from "@/lib/places";
import {
  todayYmdInTz,
  eachYmdInclusive,
  clampYmdToRange,
} from "@/lib/dates";
import {
  bulletsFromRow,
  slotHm,
  slotHourGridPlacement,
  slotSpansNextCalendarDay,
  slotTodoItemsFromRow,
} from "@/lib/slot-display";
import { slotTodoProgressLabel } from "@/lib/slot-todos";
import { SlotTodosFooter } from "@/components/slot-todos-footer";
import type { Database } from "@/lib/database.types";
import { RunsheetDayScroller } from "@/components/runsheet-day-scroller";
import { RunsheetMoreMenu } from "@/components/runsheet-more-menu";
import { TripHeroImage } from "@/components/trip-hero-image";
import { DayStatusDot } from "@/components/day-status-dot";
import { ScrollToDay } from "@/components/scroll-to-day";

type DayRow = Database["public"]["Tables"]["runsheet_days"]["Row"];
type SlotRow = Database["public"]["Tables"]["slots"]["Row"];
type CheckRow = Database["public"]["Tables"]["checklist_items"]["Row"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const HOUR_PX = 48;
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 22;

function q(
  id: string,
  parts: { day?: string; tab?: string; sv?: string },
): string {
  const p = new URLSearchParams();
  if (parts.day) p.set("day", parts.day);
  if (parts.tab) p.set("tab", parts.tab);
  if (parts.sv) p.set("sv", parts.sv);
  const s = p.toString();
  return s ? `/runsheet/${id}?${s}` : `/runsheet/${id}`;
}

function TripDateSummary({
  startDate,
  endDate,
  tz,
}: {
  startDate: string;
  endDate: string;
  tz: string;
}) {
  const ds = DateTime.fromISO(startDate, { zone: tz });
  const de = DateTime.fromISO(endDate, { zone: tz });
  const label =
    ds.toFormat("d MMM yyyy") === de.toFormat("d MMM yyyy")
      ? ds.toFormat("d MMM yyyy")
      : `${ds.toFormat("d MMM yyyy")} – ${de.toFormat("d MMM yyyy")}`;
  return <p className="mt-1 text-[0.8rem] text-rs-muted">{label}</p>;
}

function SlotCard({
  runsheetId,
  slot,
  tz,
}: {
  runsheetId: string;
  slot: SlotRow;
  tz: string;
}) {
  const meta = activityMeta(slot.activity_type);
  const bullets = bulletsFromRow(slot);
  const slotTodos = slotTodoItemsFromRow(slot);
  const map = placeLink(slot.map_url, slot.location_name);
  return (
    <div className="overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition dark:shadow-[0_4px_18px_rgba(0,0,0,0.35)]">
      <Link
        href={`/runsheet/${runsheetId}/activity/${slot.id}`}
        className="block w-full cursor-pointer p-3 text-left font-[inherit] text-inherit no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rs-primary"
      >
        <div className="flex items-start gap-3">
          <div className="rs-date-badge flex min-w-[4.5rem] flex-col gap-0.5 py-2">
            <span className="tabular-nums">{slotHm(slot.start_at, tz)}</span>
            <ActivityIcon
              type={slot.activity_type}
              className="mx-auto h-3.5 w-3.5"
              color={meta.border}
            />
            <span className="tabular-nums">
              {slot.open_ended ? (
                <span className="text-[0.7rem] font-bold text-rs-label">open</span>
              ) : (
                slotHm(slot.end_at, tz)
              )}
            </span>
          </div>
          <div
            className="min-w-0 flex-1 border-l-[4px] pl-3"
            style={{
              borderColor: meta.border,
              background: `linear-gradient(90deg,${meta.tint} 0%,var(--color-rs-surface) 12%)`,
            }}
          >
            <p className="text-[0.9rem] font-bold leading-snug">
              {slot.title ?? "Untitled"}
            </p>
            {slot.description ? (
              <p className="mt-1 text-[0.8rem] text-rs-muted">{slot.description}</p>
            ) : null}
            {bullets.length ? (
              <ul
                className="mt-2 space-y-1 border-l-2 pl-3 text-[0.78rem] leading-relaxed text-rs-muted"
                style={{ borderColor: "var(--color-rs-primary)" }}
              >
                {bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {slot.preview_image_url ? (
            <div
              className="h-12 w-12 shrink-0 rounded-lg bg-rs-fill bg-cover bg-center"
              style={{ backgroundImage: `url(${slot.preview_image_url})` }}
            />
          ) : null}
        </div>
      </Link>
      {map ? (
        <a
          href={map}
          target="_blank"
          rel="noreferrer"
          className="no-print flex min-h-11 items-center gap-1.5 border-t border-rs-border px-3 py-2 text-[0.75rem] font-bold text-rs-primary no-underline"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {slot.location_name ?? "Open in Maps"}
        </a>
      ) : null}
      <SlotTodosFooter runsheetId={runsheetId} slotId={slot.id} items={slotTodos} />
    </div>
  );
}

export async function RunsheetView({
  id,
  searchParams,
}: {
  id: string;
  searchParams: { day?: string; tab?: string; sv?: string };
}) {
  const user = await getSessionUser();
  if (!user) notFound();

  const supabase = await createClient();
  const { data: runsheet, error: rsErr } = await supabase
    .from("runsheets")
    .select("id, title, timezone, start_date, end_date, hero_image_url")
    .eq("id", id)
    .maybeSingle();

  if (rsErr || !runsheet) notFound();

  const tz = runsheet.timezone || "UTC";
  const spanMin = runsheet.start_date;
  const spanMax = runsheet.end_date;

  const dayParam = searchParams.day;
  const preliminaryFocus =
    dayParam && DateTime.fromISO(dayParam, { zone: tz }).isValid ? dayParam : todayYmdInTz(tz);

  const carouselMin =
    DateTime.fromISO(spanMin, { zone: tz }).minus({ days: 1 }).toISODate() ?? spanMin;
  const carouselMax =
    DateTime.fromISO(spanMax, { zone: tz }).plus({ days: 1 }).toISODate() ?? spanMax;

  const labels = eachYmdInclusive(carouselMin, carouselMax, tz);
  const focusYmd = clampYmdToRange(preliminaryFocus, carouselMin, carouselMax, tz);
  await ensureRunsheetDays(id, labels);

  // `status` arrives with 20260722100000_day_status_and_trip_ideas.sql. Fall back to a
  // status-less read so an un-migrated database still renders the trip.
  const daysWithStatus = await supabase
    .from("runsheet_days")
    .select("id, day_date, label, is_special, status")
    .eq("runsheet_id", id)
    .in("day_date", labels)
    .order("day_date", { ascending: true });

  let dayList = (daysWithStatus.data ?? []) as DayRow[];
  if (daysWithStatus.error) {
    const legacy = await supabase
      .from("runsheet_days")
      .select("id, day_date, label, is_special")
      .eq("runsheet_id", id)
      .in("day_date", labels)
      .order("day_date", { ascending: true });
    dayList = ((legacy.data ?? []) as Omit<DayRow, "status">[]).map((d) => ({
      ...d,
      status: "free",
    }));
  }

  const dayIds = dayList.map((d) => d.id);
  const dayByYmd = Object.fromEntries(dayList.map((d) => [d.day_date, d]));

  const focusDay = dayByYmd[focusYmd];

  const [slotsRes, checklistRes, ideasRes] = await Promise.all([
    dayIds.length > 0
      ? supabase
          .from("slots")
          .select("*")
          .in("day_id", dayIds)
          .order("start_at", { ascending: true })
      : Promise.resolve({ data: null as SlotRow[] | null }),
    dayIds.length > 0
      ? supabase
          .from("checklist_items")
          .select("*")
          .in("day_id", dayIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: null as CheckRow[] | null }),
    supabase.from("trip_ideas").select("id").eq("runsheet_id", id),
  ]);

  const slots = (slotsRes.data ?? []) as SlotRow[];
  const checklist = (checklistRes.data ?? []) as CheckRow[];
  // trip_ideas may not exist yet on an un-migrated database — treat that as "no ideas".
  const ideaCount = ideasRes.error ? 0 : (ideasRes.data?.length ?? 0);

  const slotsByDay: Record<string, SlotRow[]> = {};
  for (const s of slots) {
    const day = dayList.find((d) => d.id === s.day_id);
    if (!day) continue;
    if (!slotsByDay[day.day_date]) slotsByDay[day.day_date] = [];
    slotsByDay[day.day_date]!.push(s);
  }

  const checklistByDayId: Record<string, CheckRow[]> = {};
  for (const c of checklist) {
    if (!checklistByDayId[c.day_id]) checklistByDayId[c.day_id] = [];
    checklistByDayId[c.day_id]!.push(c);
  }

  const tab = searchParams.tab === "schedule" ? "schedule" : "list";
  const sv = searchParams.sv === "all" ? "all" : "hours";

  const focusSlots = slotsByDay[focusYmd] ?? [];
  const todayYmd = todayYmdInTz(tz);

  function navDay(day: string) {
    if (tab === "list") return q(id, { day });
    return q(id, { day, tab: "schedule", sv });
  }

  const dayChips = labels.map((ymd) => ({
    ymd,
    href: navDay(ymd),
    slotCount: slotsByDay[ymd]?.length ?? 0,
    statusDot: dayStatusMeta(dayByYmd[ymd]?.status).dot,
  }));

  return (
    <div
      className="print-root flex min-h-dvh justify-center bg-rs-page p-0 pb-28 font-sans text-rs-text antialiased sm:p-2.5"
      data-print-title={runsheet.title}
    >
      <div className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-none border-0 border-transparent bg-rs-surface shadow-none sm:rounded-[24px] sm:border sm:border-rs-border sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_12px_48px_rgba(0,0,0,0.55)]">
        <TripHeroImage src={runsheet.hero_image_url} alt={`${runsheet.title} hero`} />
        <div className="flex items-start justify-between gap-3 border-b border-rs-border bg-rs-surface px-4 py-5">
          <div className="min-w-0">
            <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Trip
            </span>
            <h1 className="mt-0.5 text-[1.1rem] font-bold leading-snug">{runsheet.title}</h1>
            <TripDateSummary startDate={runsheet.start_date} endDate={runsheet.end_date} tz={tz} />
            <div className="no-print mt-2 inline-flex gap-1 rounded-[10px] bg-rs-fill p-1">
              <Link
                href={q(id, { day: focusYmd, tab: "list" })}
                role="tab"
                aria-selected={tab === "list"}
                className="rs-tab inline-flex min-w-16 items-center justify-center px-2 text-center no-underline shadow-none"
              >
                List
              </Link>
              <Link
                href={q(id, { day: focusYmd, tab: "schedule", sv })}
                role="tab"
                aria-selected={tab === "schedule"}
                className="rs-tab inline-flex min-w-16 items-center justify-center px-2 text-center no-underline shadow-none"
              >
                Schedule
              </Link>
            </div>
          </div>
          <div className="no-print flex shrink-0 flex-col items-end gap-2 pt-0.5">
            <Link href="/dashboard" className="text-[0.72rem] font-bold text-rs-primary no-underline hover:underline">
              ← Back
            </Link>
            <RunsheetMoreMenu id={id} />
          </div>
        </div>

        <div className="no-print sticky top-0 z-10 border-b border-rs-border bg-rs-surface/95 px-3 py-2 backdrop-blur">
          <RunsheetDayScroller
            tz={tz}
            chips={dayChips}
            focusYmd={focusYmd}
            todayYmd={todayYmd}
            mode={tab === "list" ? "jump" : "link"}
          />
        </div>

        {tab === "list" ? (
          <div
            role="tabpanel"
            className="flex-1 bg-rs-surface px-[15px] pb-4 pt-3"
            id="view-list"
          >
            {dayParam ? <ScrollToDay ymd={focusYmd} /> : null}

            {labels.map((ymd) => {
              const drow = dayByYmd[ymd];
              const rows = slotsByDay[ymd] ?? [];
              const dt = DateTime.fromISO(ymd, { zone: tz });
              const status = dayStatusMeta(drow?.status);
              const dayChecklist = drow ? (checklistByDayId[drow.id] ?? []) : [];
              const dayTodoRows = rows.flatMap((slot) =>
                slotTodoItemsFromRow(slot).map((item) => ({ slot, item })),
              );
              const openTodoCount =
                dayChecklist.filter((c) => !c.done).length +
                dayTodoRows.filter((t) => !t.item.done).length;
              const overBudget = isOverBudget(drow?.status, rows.length);

              return (
                <section
                  key={ymd}
                  id={`day-${ymd}`}
                  className="mb-7 scroll-mt-24 print-break"
                >
                  <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-rs-border pb-1.5">
                    <div className="min-w-0">
                      <h2 className="text-[0.95rem] font-bold leading-tight">
                        {dt.toFormat("cccc d MMM")}
                        {ymd === todayYmd ? (
                          <span className="ml-2 rounded-full bg-rs-today px-2 py-0.5 align-middle text-[0.6rem] font-bold uppercase tracking-wide text-rs-primary">
                            Today
                          </span>
                        ) : null}
                      </h2>
                      {drow?.label ? (
                        <p className="truncate text-[0.72rem] text-rs-label">{drow.label}</p>
                      ) : null}
                    </div>
                    {drow ? (
                      <DayStatusDot runsheetId={id} dayId={drow.id} status={drow.status} />
                    ) : null}
                  </div>

                  {overBudget ? (
                    <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-rs-fill px-2.5 py-2 text-[0.72rem] text-rs-muted">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>
                        {rows.length} things on a working day. You wanted these kept to{" "}
                        {LIGHT_DAY_SLOT_BUDGET} or fewer.
                      </span>
                    </p>
                  ) : null}

                  {rows.length === 0 ? (
                    <p className="py-1 text-[0.78rem] text-rs-label">
                      Nothing planned{status.label === "Working" ? " — as intended" : " yet"}.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {rows.map((slot) => (
                        <SlotCard key={slot.id} runsheetId={id} slot={slot} tz={tz} />
                      ))}
                    </div>
                  )}

                  {drow ? (
                    <details className="no-print mt-2 rounded-[12px] border border-rs-border bg-rs-muted-surface px-3 py-2">
                      <summary className="cursor-pointer list-none text-[0.72rem] font-bold text-rs-muted">
                        To-dos{openTodoCount > 0 ? ` · ${openTodoCount} open` : ""}
                      </summary>

                      <ul className="mt-2 space-y-2 text-[0.78rem] text-rs-secondary">
                        {dayChecklist.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <form action={toggleChecklistItem} className="inline">
                              <input type="hidden" name="runsheet_id" value={id} />
                              <input type="hidden" name="item_id" value={item.id} />
                              <input type="hidden" name="done" value={item.done ? "false" : "true"} />
                              <button
                                type="submit"
                                className="mt-0.5 font-[inherit] text-rs-muted"
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
                              {item.label}
                            </span>
                          </li>
                        ))}
                        {dayTodoRows.map(({ slot, item }) => (
                          <li key={`${slot.id}:${item.id}`} className="flex items-start gap-2">
                            <form action={toggleSlotTodoItem} className="inline">
                              <input type="hidden" name="runsheet_id" value={id} />
                              <input type="hidden" name="slot_id" value={slot.id} />
                              <input type="hidden" name="todo_id" value={item.id} />
                              <input type="hidden" name="done" value={item.done ? "false" : "true"} />
                              <button
                                type="submit"
                                className="mt-0.5 font-[inherit] text-rs-muted"
                                aria-label={item.done ? "Mark not done" : "Mark done"}
                              >
                                {item.done ? (
                                  <Check className="h-4 w-4" aria-hidden />
                                ) : (
                                  <Square className="h-4 w-4" aria-hidden />
                                )}
                              </button>
                            </form>
                            <div className="min-w-0">
                              <span className={item.done ? "text-rs-label line-through" : ""}>
                                {item.text}
                              </span>
                              <p className="truncate text-[0.66rem] font-bold text-rs-label">
                                {slot.title ?? "Untitled slot"}
                              </p>
                            </div>
                          </li>
                        ))}
                        {dayChecklist.length === 0 && dayTodoRows.length === 0 ? (
                          <li className="text-[0.75rem] text-rs-label">Nothing to do.</li>
                        ) : null}
                      </ul>

                      <form action={addChecklistItem} className="mt-3 flex gap-2">
                        <input type="hidden" name="runsheet_id" value={id} />
                        <input type="hidden" name="day_id" value={drow.id} />
                        <input
                          name="label"
                          placeholder="Add to-do"
                          className="min-w-0 flex-1 rounded-xl border border-rs-border bg-rs-surface px-2 py-1.5 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-rs-primary px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Add
                        </button>
                      </form>
                    </details>
                  ) : null}

                  <Link
                    href={`/runsheet/${id}/new?day=${ymd}`}
                    className="no-print mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-rs-border text-[0.75rem] font-bold text-rs-label no-underline"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add to {dt.toFormat("ccc d")}
                  </Link>
                </section>
              );
            })}
          </div>
        ) : (
          <div
            role="tabpanel"
            className="flex-1 bg-rs-surface px-2 pb-4 pt-0"
            id="view-schedule"
          >
            <div
              className="no-print mx-1 mb-3 flex gap-1 rounded-[10px] bg-rs-fill p-1"
              role="tablist"
              aria-label="Schedule style"
              data-schedule-nested-tabs
            >
              <Link
                href={q(id, { day: focusYmd, tab: "schedule", sv: "hours" })}
                role="tab"
                aria-selected={sv === "hours"}
                className="rs-tab inline-flex flex-1 items-center justify-center shadow-none no-underline"
              >
                Day · hours
              </Link>
              <Link
                href={q(id, { day: focusYmd, tab: "schedule", sv: "all" })}
                role="tab"
                aria-selected={sv === "all"}
                className="rs-tab inline-flex flex-1 items-center justify-center shadow-none no-underline"
              >
                All days
              </Link>
            </div>

            {sv === "hours" ? (
              <div role="tabpanel" id="view-schedule-hours">
                <div className="mb-2 flex items-center justify-center gap-2 px-1">
                  <p className="text-center text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
                    {DateTime.fromISO(focusYmd, { zone: tz }).toFormat("ccc d MMM")} · by hour
                  </p>
                  {focusDay ? (
                    <DayStatusDot
                      runsheetId={id}
                      dayId={focusDay.id}
                      status={focusDay.status}
                    />
                  ) : null}
                </div>
                <div
                  className="mx-auto grid max-w-full grid-cols-[2.75rem_1fr] overflow-hidden rounded-xl border border-rs-border"
                  style={{ minHeight: HOURS.length * HOUR_PX }}
                >
                  <div className="bg-rs-muted-surface py-1 pr-0.5">
                    {HOURS.map((h) => (
                      <div key={h} className="rs-hour">
                        {String(h).padStart(2, "0")}
                      </div>
                    ))}
                  </div>
                  <div className="relative border-l border-rs-border bg-rs-surface">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="border-b border-rs-border"
                        style={{ height: HOUR_PX }}
                      />
                    ))}
                    {focusSlots.map((slot) => {
                      const meta = activityMeta(slot.activity_type);
                      const { top, height, crossesMidnight } = slotHourGridPlacement(
                        slot.start_at,
                        slot.end_at,
                        tz,
                        slot.open_ended,
                        GRID_START_HOUR,
                        GRID_END_HOUR,
                        HOUR_PX,
                      );
                      const endLabel = slot.open_ended
                        ? "open"
                        : `${slotHm(slot.end_at, tz)}${crossesMidnight ? "+" : ""}`;
                      const todoItems = slotTodoItemsFromRow(slot);
                      const todoNote =
                        todoItems.length > 0
                          ? ` · ${slotTodoProgressLabel(todoItems)} to-do${todoItems.length > 1 ? "s" : ""}`
                          : "";
                      return (
                        <Link
                          key={slot.id}
                          href={`/runsheet/${id}/activity/${slot.id}`}
                          className="rs-slot absolute text-inherit no-underline"
                          style={{
                            top,
                            height,
                            borderColor: meta.border,
                          }}
                        >
                          <span className="block truncate text-rs-text">
                            {slotHm(slot.start_at, tz)}–{endLabel}
                          </span>
                          <span className="block truncate text-[0.65rem] font-bold text-rs-muted">
                            {slot.title}
                            {todoNote}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div role="tabpanel" className="space-y-3 px-1" id="view-schedule-alldays">
                {labels.map((ymd) => {
                  const rows = slotsByDay[ymd] ?? [];
                  const drow = dayByYmd[ymd];
                  const title = DateTime.fromISO(ymd, { zone: tz }).toFormat("ccc d MMM");
                  return (
                    <div key={ymd} className="rs-card">
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <h3 className="text-[0.85rem] font-bold text-rs-text">{title}</h3>
                        {drow ? (
                          <DayStatusDot runsheetId={id} dayId={drow.id} status={drow.status} />
                        ) : null}
                      </div>
                      {rows.length === 0 ? (
                        <p className="text-[0.78rem] text-rs-label">No slots</p>
                      ) : (
                        <ul className="space-y-2">
                          {rows.map((slot) => {
                            const todoItems = slotTodoItemsFromRow(slot);
                            const crosses = slotSpansNextCalendarDay(
                              slot.start_at,
                              slot.end_at,
                              tz,
                              slot.open_ended,
                            );
                            const endShown =
                              slot.open_ended ? "open" : `${slotHm(slot.end_at, tz)}${crosses ? "+" : ""}`;
                            const todoNote =
                              todoItems.length > 0
                                ? ` · ${slotTodoProgressLabel(todoItems)} to-do${todoItems.length > 1 ? "s" : ""}`
                                : "";
                            return (
                              <li key={slot.id} className="text-[0.78rem]">
                                <Link
                                  href={`/runsheet/${id}/activity/${slot.id}`}
                                  className="font-bold text-rs-text no-underline hover:text-rs-primary"
                                >
                                  {slotHm(slot.start_at, tz)}–{endShown} · {slot.title}
                                  {todoNote}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="no-print fixed bottom-0 left-0 right-0 z-20 flex justify-center bg-gradient-to-t from-rs-page via-rs-page to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex w-full max-w-[450px] gap-2">
            <Link
              href={`/runsheet/${id}/ideas`}
              className="flex h-14 shrink-0 items-center gap-1.5 rounded-[14px] border border-rs-border bg-rs-surface px-4 text-[0.85rem] font-bold text-rs-secondary no-underline shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            >
              <Lightbulb className="h-4 w-4" aria-hidden />
              Ideas
              {ideaCount > 0 ? (
                <span className="rounded-full bg-rs-fill px-1.5 text-[0.7rem]">{ideaCount}</span>
              ) : null}
            </Link>
            <Link
              href={`/runsheet/${id}/new?day=${focusYmd}`}
              className="rs-add-btn flex-1 no-underline"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add slot
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
