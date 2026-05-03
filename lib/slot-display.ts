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
