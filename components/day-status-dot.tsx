import { cycleDayStatus } from "@/app/actions/days";
import { dayStatusMeta, normalizeDayStatus } from "@/lib/day-status";

/**
 * Tap to advance a day's status. The seeded work/leave pattern is an assumption, so
 * correcting it has to cost one tap — 44px target, no menu, no confirm.
 */
export function DayStatusDot({
  runsheetId,
  dayId,
  status,
  showLabel = true,
}: {
  runsheetId: string;
  dayId: string;
  status: string | null | undefined;
  showLabel?: boolean;
}) {
  const meta = dayStatusMeta(status);
  const current = normalizeDayStatus(status);
  return (
    <form action={cycleDayStatus} className="no-print inline-flex">
      <input type="hidden" name="runsheet_id" value={runsheetId} />
      <input type="hidden" name="day_id" value={dayId} />
      <input type="hidden" name="current" value={current} />
      <button
        type="submit"
        title={`${meta.label} — ${meta.hint}. Tap to change.`}
        aria-label={`Day status: ${meta.label}. Tap to change.`}
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 py-2 text-[0.68rem] font-bold text-rs-muted transition active:bg-rs-fill"
      >
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-rs-surface"
          style={{ backgroundColor: meta.dot }}
        />
        {showLabel ? <span className="uppercase tracking-wide">{meta.short}</span> : null}
      </button>
    </form>
  );
}
