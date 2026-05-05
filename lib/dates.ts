import { DateTime } from "luxon";

export function todayYmdInTz(timeZone: string): string {
  return DateTime.now().setZone(timeZone).toISODate() ?? "";
}

/** Consecutive inclusive calendar dates from startYmd through endYmd (in `timeZone`). */
export function eachYmdInclusive(
  startYmd: string,
  endYmd: string,
  timeZone: string,
): string[] {
  let start = DateTime.fromISO(startYmd, { zone: timeZone }).startOf("day");
  let end = DateTime.fromISO(endYmd, { zone: timeZone }).startOf("day");
  if (!start.isValid || !end.isValid) return [];
  if (end < start) {
    const t = start;
    start = end;
    end = t;
  }
  const out: string[] = [];
  for (let d = start; d <= end; d = d.plus({ days: 1 })) {
    const iso = d.toISODate();
    if (iso) out.push(iso);
  }
  return out;
}

/** Clamp `ymd` to [minYmd, maxYmd], inclusive by calendar order in zone. */
export function clampYmdToRange(
  ymd: string,
  minYmd: string,
  maxYmd: string,
  timeZone: string,
): string {
  const dt = DateTime.fromISO(ymd, { zone: timeZone }).startOf("day");
  const min = DateTime.fromISO(minYmd, { zone: timeZone }).startOf("day");
  const max = DateTime.fromISO(maxYmd, { zone: timeZone }).startOf("day");
  if (!min.isValid || !max.isValid) return ymd;
  if (!dt.isValid) return min.toISODate() ?? minYmd;
  if (dt < min) return min.toISODate() ?? minYmd;
  if (dt > max) return max.toISODate() ?? maxYmd;
  return ymd;
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

/**
 * End instant for a wall-clock range starting on `startDayYmd`.
 * If end time is strictly before start time on the same calendar day (e.g. 22:00–02:00), end is taken as the next calendar day.
 * Equal times stay on the same day (same instant as start).
 */
export function localWallRangeEndUtcIso(
  startDayYmd: string,
  timeZone: string,
  startHm: string,
  endHm: string,
): string {
  const [sh, sm] = startHm.split(":").map(Number);
  const [eh, em] = endHm.split(":").map(Number);
  const startLocal = DateTime.fromISO(`${startDayYmd}T00:00:00`, { zone: timeZone }).set({
    hour: sh,
    minute: sm,
    second: 0,
    millisecond: 0,
  });
  let endLocal = DateTime.fromISO(`${startDayYmd}T00:00:00`, { zone: timeZone }).set({
    hour: eh,
    minute: em,
    second: 0,
    millisecond: 0,
  });
  if (!startLocal.isValid || !endLocal.isValid) {
    return localWallToUtcIso(startDayYmd, eh, em, timeZone);
  }
  if (endLocal < startLocal) {
    endLocal = endLocal.plus({ days: 1 });
  }
  return endLocal.toUTC().toISO() ?? new Date().toISOString();
}

export function formatUtcInZone(iso: string, timeZone: string, fmt: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timeZone)
    .toFormat(fmt);
}
