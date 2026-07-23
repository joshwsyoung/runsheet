"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Plus,
  Lightbulb,
  AlertTriangle,
  Check,
  Square,
  Navigation,
  Ticket,
  Phone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { slotActions } from "@/lib/slot-actions";
import { activityMeta } from "@/lib/activity-types";
import { ActivityIcon } from "@/lib/activity-icons";
import {
  dayStatusMeta,
  isOverBudget,
  nextDayStatus,
  normalizeDayStatus,
  LIGHT_DAY_SLOT_BUDGET,
} from "@/lib/day-status";
import {
  slotHm,
  slotHourGridPlacement,
  slotSpansNextCalendarDay,
  slotTodoItemsFromRow,
} from "@/lib/slot-display";
import { slotTodoProgressLabel } from "@/lib/slot-todos";
import type { Database } from "@/lib/database.types";
import { setDayStatusRemote, toggleTodoRemote, addChecklistRemote } from "@/app/actions/quick";
import { useViewToggle } from "@/components/view-toggle-context";

type SlotRow = Database["public"]["Tables"]["slots"]["Row"];
type CheckRow = Database["public"]["Tables"]["checklist_items"]["Row"];

export type DayPayload = {
  id: string;
  ymd: string;
  label: string | null;
  status: string;
};

/** Height of the sticky AppHeader (h-12), which the day strip pins directly beneath. */
const APP_HEADER_PX = 48;

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const HOUR_PX = 48;
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 22;

type Tab = "list" | "schedule";
type ScheduleView = "hours" | "all";

/**
 * The whole runsheet is one client view over a single server payload.
 *
 * Everything the user switches between — list vs schedule, which day is in focus, the
 * hour grid — is local state, so none of it costs a round trip. Before this, each of
 * those was a full RSC navigation to a US-East function plus ~8 Supabase queries, which
 * is why it crawled. Mutations are optimistic for the same reason: the checkbox moves
 * now, the write lands in the background.
 */
export function RunsheetApp({
  runsheetId,
  title,
  tz,
  startDate,
  endDate,
  days,
  slots,
  checklist,
  ideaCount,
  todayYmd,
  initialFocusYmd,
  initialTab,
  initialScheduleView,
}: {
  runsheetId: string;
  title: string;
  tz: string;
  startDate: string;
  endDate: string;
  days: DayPayload[];
  slots: SlotRow[];
  checklist: CheckRow[];
  ideaCount: number;
  todayYmd: string;
  initialFocusYmd: string;
  initialTab: Tab;
  initialScheduleView: ScheduleView;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [scheduleView, setScheduleView] = useState<ScheduleView>(initialScheduleView);
  const [focusYmd, setFocusYmd] = useState(initialFocusYmd);
  const [, startTransition] = useTransition();

  // Hand the List/Schedule toggle to the sticky header while this view is on screen, so
  // it stays reachable after scrolling to a day. Keep local state as the source of truth.
  const setViewController = useViewToggle()?.setController;
  useEffect(() => {
    setViewController?.({ tab, setTab });
  }, [tab, setViewController]);
  useEffect(() => () => setViewController?.(null), [setViewController]);

  // Optimistic mirrors. Keyed so a failed write can be reverted in place.
  const [statusById, setStatusById] = useState<Record<string, string>>(() =>
    Object.fromEntries(days.map((d) => [d.id, d.status])),
  );
  const [doneByKey, setDoneByKey] = useState<Record<string, boolean>>({});
  const [extraChecks, setExtraChecks] = useState<CheckRow[]>([]);

  const chipRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const sectionRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const stripRef = useRef<HTMLDivElement | null>(null);
  const stripWrapRef = useRef<HTMLDivElement | null>(null);

  const slotsByYmd = useMemo(() => {
    const byId = new Map(days.map((d) => [d.id, d.ymd]));
    const out: Record<string, SlotRow[]> = {};
    for (const s of slots) {
      const ymd = byId.get(s.day_id);
      if (!ymd) continue;
      (out[ymd] ??= []).push(s);
    }
    return out;
  }, [days, slots]);

  const checksByDayId = useMemo(() => {
    const out: Record<string, CheckRow[]> = {};
    for (const c of [...checklist, ...extraChecks]) (out[c.day_id] ??= []).push(c);
    return out;
  }, [checklist, extraChecks]);

  const focusSlots = slotsByYmd[focusYmd] ?? [];

  // Keep the URL honest for refresh/deep-links without triggering a navigation.
  useEffect(() => {
    const p = new URLSearchParams();
    p.set("day", focusYmd);
    if (tab === "schedule") {
      p.set("tab", "schedule");
      p.set("sv", scheduleView);
    }
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, [focusYmd, tab, scheduleView]);

  /**
   * Pan the day strip horizontally to centre a chip.
   *
   * Sets scrollLeft on the strip directly rather than calling scrollIntoView: that
   * scrolls *every* scrollable ancestor including the window, so tracking the page
   * scroll with it yanked the page back up as you scrolled. This can only ever move
   * the strip sideways.
   */
  const panStripTo = useCallback((ymd: string, smooth: boolean) => {
    const strip = stripRef.current;
    const chip = chipRefs.current.get(ymd);
    if (!strip || !chip) return;
    const target = Math.max(
      0,
      Math.min(
        chip.offsetLeft - (strip.clientWidth - chip.clientWidth) / 2,
        strip.scrollWidth - strip.clientWidth,
      ),
    );
    if (smooth) strip.scrollTo({ left: target, behavior: "smooth" });
    else strip.scrollLeft = target;
  }, []);

  /**
   * The strip is a position indicator: as the page scrolls, whichever day is crossing
   * the line just under the strip becomes the active one, and the strip pans to match.
   * Updated per animation frame so a fast scroll pans smoothly rather than jumping.
   */
  useEffect(() => {
    if (tab !== "list") return;

    const update = () => {
      const wrap = stripWrapRef.current;
      // The line sits just below the sticky strip — the first thing the user can read.
      const lineY = (wrap?.getBoundingClientRect().bottom ?? 0) + 12;

      let active: string | null = null;
      for (const d of days) {
        const el = sectionRefs.current.get(d.ymd);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= lineY) active = d.ymd;
        else break;
      }
      // Above the first day header, keep the first day selected.
      if (!active && days.length) active = days[0]!.ymd;

      if (active) {
        setFocusYmd((prev) => (prev === active ? prev : active!));
        panStripTo(active, false);
      }
    };

    // Run straight off the scroll event rather than scheduling a frame. Browsers already
    // coalesce scroll to roughly one event per frame, and a rAF gate silently latches
    // when frames stop being served (backgrounded tab), leaving the strip stuck.
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [tab, days, panStripTo]);

  // In schedule mode nothing is scrolling, so centre the chip on selection.
  useEffect(() => {
    if (tab === "list") return;
    panStripTo(focusYmd, true);
  }, [tab, focusYmd, panStripTo]);

  const dayIndex = days.findIndex((d) => d.ymd === focusYmd);

  /** Move the schedule a day at a time, clamped to the trip. */
  const stepDay = useCallback(
    (delta: number) => {
      const next = days[dayIndex + delta];
      if (next) setFocusYmd(next.ymd);
    },
    [days, dayIndex],
  );

  // Horizontal swipe changes day in the schedule. Vertical intent is left alone so the
  // grid still scrolls: only act when the gesture is clearly sideways.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onDayTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  }, []);
  const onDayTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current;
      touchStart.current = null;
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      stepDay(dx < 0 ? 1 : -1);
    },
    [stepDay],
  );

  const jumpToDay = useCallback(
    (ymd: string) => {
      setFocusYmd(ymd);
      panStripTo(ymd, true);
      if (tab !== "list") return;
      const el = sectionRefs.current.get(ymd);
      const wrap = stripWrapRef.current;
      if (!el) return;
      // Land the day header just below where the strip pins, not underneath it.
      const offset = APP_HEADER_PX + (wrap?.offsetHeight ?? 0) + 8;
      const top = window.scrollY + el.getBoundingClientRect().top - offset;
      window.scrollTo({ top, behavior: "smooth" });
    },
    [tab, panStripTo],
  );

  const cycleStatus = useCallback(
    (dayId: string) => {
      const current = statusById[dayId];
      const next = nextDayStatus(current);
      setStatusById((s) => ({ ...s, [dayId]: next }));
      startTransition(async () => {
        const ok = await setDayStatusRemote(runsheetId, dayId, next);
        if (!ok) setStatusById((s) => ({ ...s, [dayId]: current ?? "free" }));
      });
    },
    [statusById, runsheetId],
  );

  const toggleTodo = useCallback(
    (key: string, current: boolean, payload: Parameters<typeof toggleTodoRemote>[0]) => {
      setDoneByKey((s) => ({ ...s, [key]: !current }));
      startTransition(async () => {
        const ok = await toggleTodoRemote({ ...payload, done: !current });
        if (!ok) setDoneByKey((s) => ({ ...s, [key]: current }));
      });
    },
    [],
  );

  function checkDone(item: CheckRow) {
    return doneByKey[`chk:${item.id}`] ?? item.done;
  }

  return (
    <>
      {/* The List/Schedule toggle now lives in the sticky header (see AppHeader), so it
          stays reachable after scrolling to a day. */}
      <div className="flex items-start justify-between gap-3 border-b border-rs-border bg-rs-surface px-4 pb-4 pt-5">
        <div className="min-w-0">
          <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
            Trip
          </span>
          <h1 className="mt-0.5 text-[1.1rem] font-bold leading-snug">{title}</h1>
          <p className="mt-1 text-[0.8rem] text-rs-muted">
            {DateTime.fromISO(startDate, { zone: tz }).toFormat("d MMM yyyy")} –{" "}
            {DateTime.fromISO(endDate, { zone: tz }).toFormat("d MMM yyyy")}
          </p>
        </div>
        <div className="no-print flex shrink-0 flex-col items-end gap-2 pt-0.5">
          <Link
            href="/dashboard"
            prefetch
            className="text-[0.72rem] font-bold text-rs-primary no-underline hover:underline"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Day strip — pure client state, no navigation. */}
      <div
        ref={stripWrapRef}
        className="no-print sticky z-10 border-b border-rs-border bg-rs-surface/95 px-3 py-2 backdrop-blur"
        style={{ top: APP_HEADER_PX }}
      >
        <div className="-mx-1 flex justify-center px-1">
          <div
            ref={stripRef}
            className="flex max-w-full gap-1 overflow-x-auto pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
            aria-label="Days"
          >
            {days.map((d) => {
              const dt = DateTime.fromISO(d.ymd, { zone: tz });
              const isFocus = d.ymd === focusYmd;
              const isToday = d.ymd === todayYmd;
              const count = slotsByYmd[d.ymd]?.length ?? 0;
              const chip = isFocus
                ? "border-2 border-rs-primary bg-rs-primary font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
                : isToday
                  ? "border-2 border-rs-primary bg-rs-today font-bold text-rs-secondary"
                  : "border border-rs-border bg-rs-surface font-bold text-rs-secondary";
              return (
                <button
                  key={d.ymd}
                  type="button"
                  role="listitem"
                  onClick={() => jumpToDay(d.ymd)}
                  ref={(node) => {
                    chipRefs.current.set(d.ymd, node);
                  }}
                  aria-current={isFocus ? "date" : undefined}
                  className={`relative flex h-[60px] w-[48px] shrink-0 flex-col items-center justify-center rounded-xl transition-colors ${chip}`}
                >
                  <span className="text-[0.55rem] font-bold uppercase opacity-80">
                    {dt.toFormat("ccc")}
                  </span>
                  <span className="text-sm font-bold">{dt.toFormat("d")}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: dayStatusMeta(statusById[d.id]).dot }}
                  />
                  {count > 0 ? (
                    <span
                      className={`absolute -right-1 top-0 inline-flex min-w-4 -translate-y-1/2 items-center justify-center rounded-full px-1 text-[0.58rem] font-bold ${
                        isFocus ? "bg-rs-surface text-rs-primary" : "bg-rs-primary text-white"
                      }`}
                    >
                      {count > 9 ? "9+" : count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === "list" ? (
        <div className="flex-1 bg-rs-surface px-[15px] pb-4 pt-3 sm:rounded-b-[24px]">
          {days.map((d) => {
            const rows = slotsByYmd[d.ymd] ?? [];
            const dt = DateTime.fromISO(d.ymd, { zone: tz });
            const status = dayStatusMeta(statusById[d.id]);
            const dayChecks = checksByDayId[d.id] ?? [];
            const todoRows = rows.flatMap((slot) =>
              slotTodoItemsFromRow(slot).map((item) => ({ slot, item })),
            );
            const openCount =
              dayChecks.filter((c) => !checkDone(c)).length +
              todoRows.filter((t) => !(doneByKey[`slot:${t.slot.id}:${t.item.id}`] ?? t.item.done))
                .length;

            return (
              <section
                key={d.ymd}
                id={`day-${d.ymd}`}
                ref={(node) => {
                  sectionRefs.current.set(d.ymd, node);
                }}
                className="mb-7 scroll-mt-32 print-break"
              >
                <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-rs-border pb-1.5">
                  <div className="min-w-0">
                    <h2 className="text-[0.95rem] font-bold leading-tight">
                      {dt.toFormat("cccc d MMM")}
                      {d.ymd === todayYmd ? (
                        <span className="ml-2 rounded-full bg-rs-today px-2 py-0.5 align-middle text-[0.6rem] font-bold uppercase tracking-wide text-rs-primary">
                          Today
                        </span>
                      ) : null}
                    </h2>
                    {d.label ? (
                      <p className="truncate text-[0.72rem] text-rs-label">{d.label}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => cycleStatus(d.id)}
                    title={`${status.label} — ${status.hint}. Tap to change.`}
                    aria-label={`Day status: ${status.label}. Tap to change.`}
                    className="no-print -my-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 py-2 text-[0.68rem] font-bold text-rs-muted transition active:bg-rs-fill"
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-rs-surface"
                      style={{ backgroundColor: status.dot }}
                    />
                    <span className="uppercase tracking-wide">{status.short}</span>
                  </button>
                </div>

                {isOverBudget(statusById[d.id], rows.length) ? (
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
                    Nothing planned
                    {normalizeDayStatus(statusById[d.id]) === "work" ? " — as intended" : " yet"}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {rows.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        runsheetId={runsheetId}
                        slot={slot}
                        tz={tz}
                        doneByKey={doneByKey}
                        onToggleTodo={toggleTodo}
                      />
                    ))}
                  </div>
                )}

                <details className="no-print mt-2 rounded-[12px] border border-rs-border bg-rs-muted-surface px-3 py-2">
                  <summary className="cursor-pointer list-none text-[0.72rem] font-bold text-rs-muted">
                    To-dos{openCount > 0 ? ` · ${openCount} open` : ""}
                  </summary>
                  <ul className="mt-2 space-y-2 text-[0.78rem] text-rs-secondary">
                    {dayChecks.map((item) => {
                      const done = checkDone(item);
                      return (
                        <li key={item.id} className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleTodo(`chk:${item.id}`, done, {
                                runsheetId,
                                kind: "checklist",
                                itemId: item.id,
                              })
                            }
                            className="mt-0.5 text-rs-muted"
                            aria-label={done ? "Mark not done" : "Mark done"}
                          >
                            {done ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                          <span className={done ? "text-rs-label line-through" : ""}>
                            {item.label}
                          </span>
                        </li>
                      );
                    })}
                    {todoRows.map(({ slot, item }) => {
                      const key = `slot:${slot.id}:${item.id}`;
                      const done = doneByKey[key] ?? item.done;
                      return (
                        <li key={key} className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleTodo(key, done, {
                                runsheetId,
                                kind: "slot",
                                slotId: slot.id,
                                todoId: item.id,
                              })
                            }
                            className="mt-0.5 text-rs-muted"
                            aria-label={done ? "Mark not done" : "Mark done"}
                          >
                            {done ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0">
                            <span className={done ? "text-rs-label line-through" : ""}>
                              {item.text}
                            </span>
                            <p className="truncate text-[0.66rem] font-bold text-rs-label">
                              {slot.title ?? "Untitled slot"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                    {dayChecks.length === 0 && todoRows.length === 0 ? (
                      <li className="text-[0.75rem] text-rs-label">Nothing to do.</li>
                    ) : null}
                  </ul>
                  <AddChecklist
                    runsheetId={runsheetId}
                    dayId={d.id}
                    onAdded={(row) => setExtraChecks((s) => [...s, row])}
                  />
                </details>

                <Link
                  href={`/runsheet/${runsheetId}/new?day=${d.ymd}`}
                  prefetch
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
        <div className="flex-1 bg-rs-surface px-2 pb-4 pt-3 sm:rounded-b-[24px]">
          <div className="no-print mx-1 mb-3 flex gap-1 rounded-[10px] bg-rs-fill p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={scheduleView === "hours"}
              onClick={() => setScheduleView("hours")}
              className="rs-tab inline-flex flex-1 items-center justify-center shadow-none"
            >
              Day · hours
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scheduleView === "all"}
              onClick={() => setScheduleView("all")}
              className="rs-tab inline-flex flex-1 items-center justify-center shadow-none"
            >
              All days
            </button>
          </div>

          {scheduleView === "hours" ? (
            <div
              onTouchStart={onDayTouchStart}
              onTouchEnd={onDayTouchEnd}
              className="touch-pan-y"
            >
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={() => stepDay(-1)}
                  disabled={dayIndex <= 0}
                  aria-label="Previous day"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rs-label disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <p className="text-center text-[0.7rem] font-bold uppercase tracking-wide text-rs-label">
                  {DateTime.fromISO(focusYmd, { zone: tz }).toFormat("ccc d MMM")}
                </p>
                <button
                  type="button"
                  onClick={() => stepDay(1)}
                  disabled={dayIndex >= days.length - 1}
                  aria-label="Next day"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rs-label disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div
                className="mx-auto grid max-w-full grid-cols-[2.25rem_1fr] overflow-hidden rounded-xl border border-rs-border"
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
                    <div key={h} className="border-b border-rs-border" style={{ height: HOUR_PX }} />
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
                    // A 30-minute block is only ~24px tall — two stacked lines collide.
                    // Below the threshold, time and title share one truncated row.
                    const compact = height < 38;
                    return (
                      <Link
                        key={slot.id}
                        href={`/runsheet/${runsheetId}/activity/${slot.id}`}
                        prefetch={false}
                        className="rs-slot absolute text-inherit no-underline"
                        style={{ top, height, borderColor: meta.border }}
                      >
                        {compact ? (
                          <span className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                            <span className="shrink-0 text-[0.55rem] tabular-nums text-rs-label">
                              {slotHm(slot.start_at, tz)}
                            </span>
                            <span className="truncate text-[0.62rem] text-rs-text">
                              {slot.title}
                            </span>
                          </span>
                        ) : (
                          <>
                            <span className="block truncate text-[0.55rem] tabular-nums text-rs-label">
                              {slotHm(slot.start_at, tz)}–{endLabel}
                            </span>
                            <span className="block truncate text-[0.65rem] text-rs-text">
                              {slot.title}
                            </span>
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 px-1">
              {days.map((d) => {
                const rows = slotsByYmd[d.ymd] ?? [];
                const status = dayStatusMeta(statusById[d.id]);
                return (
                  <div key={d.ymd} className="rs-card">
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <h3 className="text-[0.85rem] font-bold text-rs-text">
                        {DateTime.fromISO(d.ymd, { zone: tz }).toFormat("ccc d MMM")}
                      </h3>
                      <button
                        type="button"
                        onClick={() => cycleStatus(d.id)}
                        className="no-print inline-flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wide text-rs-muted"
                      >
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: status.dot }}
                        />
                        {status.short}
                      </button>
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
                          const endShown = slot.open_ended
                            ? "open"
                            : `${slotHm(slot.end_at, tz)}${crosses ? "+" : ""}`;
                          const todoNote =
                            todoItems.length > 0
                              ? ` · ${slotTodoProgressLabel(todoItems)} to-do${todoItems.length > 1 ? "s" : ""}`
                              : "";
                          return (
                            <li key={slot.id} className="text-[0.78rem]">
                              <Link
                                href={`/runsheet/${runsheetId}/activity/${slot.id}`}
                                prefetch={false}
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
            href={`/runsheet/${runsheetId}/ideas`}
            prefetch
            className="flex h-14 shrink-0 items-center gap-1.5 rounded-[14px] border border-rs-border bg-rs-surface px-4 text-[0.85rem] font-bold text-rs-secondary no-underline shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <Lightbulb className="h-4 w-4" aria-hidden />
            Ideas
            {ideaCount > 0 ? (
              <span className="rounded-full bg-rs-fill px-1.5 text-[0.7rem]">{ideaCount}</span>
            ) : null}
          </Link>
          <Link
            href={`/runsheet/${runsheetId}/new?day=${focusYmd}`}
            prefetch
            className="rs-add-btn flex-1 no-underline"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add slot
          </Link>
        </div>
      </div>
    </>
  );
}

function SlotCard({
  runsheetId,
  slot,
  tz,
  doneByKey,
  onToggleTodo,
}: {
  runsheetId: string;
  slot: SlotRow;
  tz: string;
  doneByKey: Record<string, boolean>;
  onToggleTodo: (
    key: string,
    current: boolean,
    payload: Parameters<typeof toggleTodoRemote>[0],
  ) => void;
}) {
  const meta = activityMeta(slot.activity_type);
  const todos = slotTodoItemsFromRow(slot);
  const actions = slotActions(slot);
  const detailHref = `/runsheet/${runsheetId}/activity/${slot.id}`;
  const endLabel = slot.open_ended ? "open" : slotHm(slot.end_at, tz);

  return (
    <div className="overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_18px_rgba(0,0,0,0.35)]">
      <Link
        href={detailHref}
        prefetch={false}
        className="block w-full text-left text-inherit no-underline"
      >
        <div
          className="border-l-[4px] p-3"
          style={{ borderColor: meta.border }}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {/* Time leads the card: side by side, not stacked. */}
              <p className="text-[0.78rem] font-bold tabular-nums text-rs-secondary">
                {slotHm(slot.start_at, tz)}
                {slot.open_ended ? (
                  <span className="pl-1 font-normal text-rs-label">onwards</span>
                ) : (
                  <>
                    <span className="px-1 font-normal text-rs-label">to</span>
                    {endLabel}
                  </>
                )}
              </p>
              <p className="mt-0.5 text-[0.95rem] font-bold leading-snug">
                {slot.title ?? "Untitled"}
              </p>
              {slot.description ? (
                <p className="mt-1 line-clamp-2 text-[0.78rem] leading-snug text-rs-muted">
                  {slot.description}
                </p>
              ) : null}
            </div>
            {/* Type moves to the corner — it's context, not the headline. */}
            <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-rs-label">
              <ActivityIcon
                type={slot.activity_type}
                className="h-3.5 w-3.5 shrink-0"
                color={meta.border}
              />
              {meta.label}
            </span>
          </div>
        </div>
      </Link>

      {actions.length ? (
        <div className="no-print flex items-stretch border-t border-rs-border">
          {actions.map((a) => {
            const cls =
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 text-[0.72rem] font-bold text-rs-primary no-underline";
            const Icon =
              a.kind === "directions"
                ? Navigation
                : a.kind === "ticket"
                  ? Ticket
                  : a.kind === "call"
                    ? Phone
                    : ExternalLink;
            const body = (
              <>
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {a.label}
              </>
            );
            return a.external ? (
              <a
                key={a.kind}
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className={`${cls} border-r border-rs-border last:border-r-0`}
              >
                {body}
              </a>
            ) : (
              <Link
                key={a.kind}
                href={a.href || detailHref}
                prefetch={false}
                className={`${cls} border-r border-rs-border last:border-r-0`}
              >
                {body}
              </Link>
            );
          })}
        </div>
      ) : null}

      {todos.length ? (
        <ul className="no-print border-t border-rs-border px-3 py-2 text-[0.75rem] text-rs-secondary">
          {todos.map((item) => {
            const key = `slot:${slot.id}:${item.id}`;
            const done = doneByKey[key] ?? item.done;
            return (
              <li key={item.id} className="flex items-start gap-2 py-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onToggleTodo(key, done, {
                      runsheetId,
                      kind: "slot",
                      slotId: slot.id,
                      todoId: item.id,
                    })
                  }
                  className="mt-0.5 text-rs-muted"
                  aria-label={done ? "Mark not done" : "Mark done"}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                </button>
                <span className={done ? "text-rs-label line-through" : ""}>{item.text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function AddChecklist({
  runsheetId,
  dayId,
  onAdded,
}: {
  runsheetId: string;
  dayId: string;
  onAdded: (row: CheckRow) => void;
}) {
  const [value, setValue] = useState("");
  const [, startTransition] = useTransition();

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const label = value.trim();
        if (!label) return;
        setValue("");
        startTransition(async () => {
          const row = await addChecklistRemote(runsheetId, dayId, label);
          if (row) onAdded(row);
        });
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add to-do"
        className="min-w-0 flex-1 rounded-xl border border-rs-border bg-rs-surface px-2 py-1.5 text-sm"
      />
      <button type="submit" className="rounded-xl bg-rs-primary px-3 py-1.5 text-xs font-bold text-white">
        Add
      </button>
    </form>
  );
}
