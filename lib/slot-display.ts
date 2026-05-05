import { DateTime } from "luxon";
import type { Database } from "@/lib/database.types";

export type SlotRow = Database["public"]["Tables"]["slots"]["Row"];

export function slotHm(iso: string, timeZone: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timeZone)
    .toFormat("HH:mm");
}

export function slotDurationLabel(
  startIso: string,
  endIso: string,
  timeZone: string,
  openEnded: boolean,
): string {
  if (openEnded) return "open";
  const s = DateTime.fromISO(startIso, { zone: "utc" }).setZone(timeZone);
  const e = DateTime.fromISO(endIso, { zone: "utc" }).setZone(timeZone);
  const mins = Math.max(0, Math.round(e.diff(s, "minutes").minutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}hr`;
  return `${h}hr ${m}m`;
}

export function bulletsFromRow(row: SlotRow): string[] {
  const raw = row.description_bullets;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function todosFromRow(row: SlotRow): string[] {
  const raw = row.todos;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  return [];
}

/** True when local end calendar date is after local start (overnight span). */
export function slotSpansNextCalendarDay(
  startIso: string,
  endIso: string,
  timeZone: string,
  openEnded: boolean,
): boolean {
  if (openEnded) return false;
  const start = DateTime.fromISO(startIso, { zone: "utc" }).setZone(timeZone);
  const end = DateTime.fromISO(endIso, { zone: "utc" }).setZone(timeZone);
  return end.startOf("day") > start.startOf("day");
}

/**
 * Vertical placement on a same-day hour grid; overnight slots clip to end of the start day for bar height.
 */
export function slotHourGridPlacement(
  startIso: string,
  endIso: string,
  timeZone: string,
  openEnded: boolean,
  gridStartHour: number,
  gridEndHour: number,
  hourPx: number,
): { top: number; height: number; crossesMidnight: boolean } {
  const start = DateTime.fromISO(startIso, { zone: "utc" }).setZone(timeZone);
  const end = DateTime.fromISO(endIso, { zone: "utc" }).setZone(timeZone);
  let endDraw = end;
  let crossesMidnight = false;
  if (!openEnded && end.startOf("day") > start.startOf("day")) {
    endDraw = start.endOf("day");
    crossesMidnight = true;
  }
  const startH = start.hour + start.minute / 60;
  const endH = endDraw.hour + endDraw.minute / 60 + endDraw.second / 3600;
  const clampedStart = Math.max(gridStartHour, startH);
  const clampedEnd = Math.min(gridEndHour, endH);
  const top = Math.max(0, (clampedStart - gridStartHour) * hourPx);
  const height = Math.max(24, (clampedEnd - clampedStart) * hourPx);
  return { top, height, crossesMidnight };
}
