import { DateTime } from "luxon";

export function todayYmdInTz(timeZone: string): string {
  return DateTime.now().setZone(timeZone).toISODate() ?? "";
}

export function weekFromAnchorYmd(
  anchorYmd: string,
  timeZone: string,
): { mondayYmd: string; labels: string[] } {
  const anchor = DateTime.fromISO(anchorYmd, { zone: timeZone }).startOf("day");
  if (!anchor.isValid) {
    const fallback = DateTime.now().setZone(timeZone).startOf("day");
    const mon = fallback.minus({ days: fallback.weekday - 1 });
    return {
      mondayYmd: mon.toISODate() ?? "",
      labels: Array.from({ length: 7 }, (_, i) => mon.plus({ days: i }).toISODate() ?? ""),
    };
  }
  const monday = anchor.minus({ days: anchor.weekday - 1 });
  const labels = Array.from(
    { length: 7 },
    (_, i) => monday.plus({ days: i }).toISODate() ?? "",
  );
  return { mondayYmd: monday.toISODate() ?? "", labels };
}

export function shiftWeekYmd(
  currentMondayYmd: string,
  timeZone: string,
  deltaWeeks: number,
): string {
  const mon = DateTime.fromISO(currentMondayYmd, { zone: timeZone }).startOf("day");
  if (!mon.isValid) return currentMondayYmd;
  return mon.plus({ weeks: deltaWeeks }).toISODate() ?? currentMondayYmd;
}

export function weekRangeLabel(mondayYmd: string, timeZone: string): string {
  const mon = DateTime.fromISO(mondayYmd, { zone: timeZone });
  const sun = mon.plus({ days: 6 });
  return `${mon.toFormat("d MMM")} – ${sun.toFormat("d MMM yyyy")}`;
}

export function localWallToUtcIso(
  dayYmd: string,
  hour: number,
  minute: number,
  timeZone: string,
): string {
  const dt = DateTime.fromISO(`${dayYmd}T00:00:00`, { zone: timeZone }).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
  return dt.toUTC().toISO() ?? new Date().toISOString();
}

export function formatUtcInZone(iso: string, timeZone: string, fmt: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timeZone)
    .toFormat(fmt);
}
