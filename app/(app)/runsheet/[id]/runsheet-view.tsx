import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { ensureRunsheetDays } from "@/app/actions/days";
import { inviteToRunsheet } from "@/app/actions/invites";
import { toggleChecklistItem, addChecklistItem } from "@/app/actions/checklist";
import { activityMeta } from "@/lib/activity-types";
import {
  todayYmdInTz,
  eachYmdInclusive,
  clampYmdToRange,
} from "@/lib/dates";
import { bulletsFromRow, slotHm } from "@/lib/slot-display";
import type { Database } from "@/lib/database.types";
import { PrintButton } from "@/components/print-button";
import { RunsheetDayScroller } from "@/components/runsheet-day-scroller";
import { updateRunsheetTripDates } from "@/app/actions/runsheets";

type DayRow = Database["public"]["Tables"]["runsheet_days"]["Row"];
type SlotRow = Database["public"]["Tables"]["slots"]["Row"];
type CheckRow = Database["public"]["Tables"]["checklist_items"]["Row"];
type InviteRow = Database["public"]["Tables"]["runsheet_invites"]["Row"];

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

const TRIP_ERROR_COPY: Record<string, string> = {
  "missing-trip-dates": "Start and end date are required.",
  "invalid-trip-dates": "End date must be on or after the start date.",
  "trip-update-failed": "Could not save dates. Try again.",
};

export async function RunsheetView({
  id,
  searchParams,
}: {
  id: string;
  searchParams: { day?: string; tab?: string; sv?: string; error?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: runsheet, error: rsErr } = await supabase
    .from("runsheets")
    .select("id, title, owner_id, timezone, start_date, end_date")
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

  const { data: days } = await supabase
    .from("runsheet_days")
    .select("id, day_date, label, is_special")
    .eq("runsheet_id", id)
    .in("day_date", labels)
    .order("day_date", { ascending: true });

  const dayList = (days ?? []) as DayRow[];
  const dayIds = dayList.map((d) => d.id);
  const dayByYmd = Object.fromEntries(dayList.map((d) => [d.day_date, d]));

  let slots: SlotRow[] = [];
  if (dayIds.length > 0) {
    const { data } = await supabase
      .from("slots")
      .select("*")
      .in("day_id", dayIds)
      .order("start_at", { ascending: true });
    slots = (data ?? []) as SlotRow[];
  }
  const slotsByDay: Record<string, SlotRow[]> = {};
  for (const s of slots) {
    const day = dayList.find((d) => d.id === s.day_id);
    if (!day) continue;
    if (!slotsByDay[day.day_date]) slotsByDay[day.day_date] = [];
    slotsByDay[day.day_date]!.push(s);
  }

  const focusDay = dayByYmd[focusYmd];
  const { data: checklistRaw } = focusDay
    ? await supabase
        .from("checklist_items")
        .select("*")
        .eq("day_id", focusDay.id)
        .order("sort_order", { ascending: true })
    : { data: [] as CheckRow[] };

  const checklist = (checklistRaw ?? []) as CheckRow[];

  const isOwner = runsheet.owner_id === user.id;
  const { data: invitesRaw } = isOwner
    ? await supabase
        .from("runsheet_invites")
        .select("*")
        .eq("runsheet_id", id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
    : { data: [] as InviteRow[] };

  const invites = (invitesRaw ?? []) as InviteRow[];

  const { data: memberRow } = await supabase
    .from("runsheet_members")
    .select("role")
    .eq("runsheet_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const canEditTrip = isOwner || memberRow?.role === "editor";

  const tab = searchParams.tab === "schedule" ? "schedule" : "list";
  const sv = searchParams.sv === "all" ? "all" : "hours";

  const focusSlots = slotsByDay[focusYmd] ?? [];

  function navDay(day: string) {
    if (tab === "list") return q(id, { day });
    return q(id, { day, tab: "schedule", sv });
  }

  const dayChips = labels.map((ymd) => ({ ymd, href: navDay(ymd) }));

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  const tripStartFmt = DateTime.fromISO(runsheet.start_date, { zone: tz });
  const tripEndFmt = DateTime.fromISO(runsheet.end_date, { zone: tz });
  const tripRangeLabel =
    tripStartFmt.toFormat("d MMM yyyy") === tripEndFmt.toFormat("d MMM yyyy")
      ? tripStartFmt.toFormat("d MMM yyyy")
      : `${tripStartFmt.toFormat("d MMM yyyy")} – ${tripEndFmt.toFormat("d MMM yyyy")}`;

  const tripErrorCopy = searchParams.error
    ? (TRIP_ERROR_COPY[searchParams.error] ??
      "Something went wrong with the dates. Try again.")
    : null;

  return (
    <div
      className="print-root flex min-h-dvh justify-center bg-[#fcfcfc] p-0 pb-28 font-sans text-[#333] antialiased sm:p-2.5"
      data-print-title={runsheet.title}
    >
      <div className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-none border-0 border-transparent bg-white shadow-none sm:rounded-[24px] sm:border sm:border-[#eeeeee] sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#eeeeee] bg-white px-4 py-5">
          <div className="min-w-0">
            <span className="block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Trip
            </span>
            <h1 className="mt-0.5 text-[1.1rem] font-bold leading-snug">{runsheet.title}</h1>
            <p className="mt-1 text-[0.8rem] text-[#666]">{tripRangeLabel}</p>
            {canEditTrip ? (
              <form
                action={updateRunsheetTripDates}
                className="no-print mt-3 flex flex-col gap-2 border-t border-[#eeeeee] pt-3"
              >
                <input type="hidden" name="runsheet_id" value={id} />
                <input type="hidden" name="return_day" value={focusYmd} />
                <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
                  Trip dates
                </span>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[7rem] flex-1 flex-col gap-1">
                    <span className="text-[0.65rem] font-bold text-[#999]">Start</span>
                    <input
                      type="date"
                      name="start_date"
                      required
                      defaultValue={runsheet.start_date}
                      className="rounded-xl border border-[#eeeeee] px-2 py-1.5 text-sm tabular-nums"
                    />
                  </label>
                  <label className="flex min-w-[7rem] flex-1 flex-col gap-1">
                    <span className="text-[0.65rem] font-bold text-[#999]">End</span>
                    <input
                      type="date"
                      name="end_date"
                      required
                      defaultValue={runsheet.end_date}
                      className="rounded-xl border border-[#eeeeee] px-2 py-1.5 text-sm tabular-nums"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#4a90e2] px-3 py-2 text-xs font-bold text-white shadow-[0_2px_8px_rgba(74,144,226,0.2)]"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : null}
          </div>
          <div className="no-print flex shrink-0 flex-col items-end gap-1 pt-1 text-right">
            <Link
              href="/dashboard"
              className="text-[0.72rem] font-bold text-[#4a90e2] no-underline hover:underline"
            >
              Runsheets
            </Link>
            <Link href="/docs/api" className="text-[0.65rem] font-bold text-[#999] no-underline hover:text-[#4a90e2]">
              API
            </Link>
          </div>
        </div>

        {tripErrorCopy ? (
          <div
            className="no-print border-b border-[#eeeeee] bg-red-50 px-4 py-2 text-center text-[0.8rem] font-bold text-red-800"
            role="alert"
          >
            {tripErrorCopy}
          </div>
        ) : null}

        <div className="border-b border-[#eeeeee] px-3 py-3">
          <RunsheetDayScroller
            tz={tz}
            chips={dayChips}
            focusYmd={focusYmd}
            todayYmd={todayYmdInTz(tz)}
          />
          <div className="no-print flex justify-end border-t border-[#eeeeee] pt-2">
            <PrintButton />
          </div>
        </div>

        <nav className="no-print flex gap-2 p-3" role="tablist" aria-label="Day layout">
          <Link
            href={q(id, { day: focusYmd, tab: "list" })}
            role="tab"
            aria-selected={tab === "list"}
            className="rs-tab inline-flex flex-1 items-center justify-center text-center no-underline"
          >
            List
          </Link>
          <Link
            href={q(id, { day: focusYmd, tab: "schedule", sv })}
            role="tab"
            aria-selected={tab === "schedule"}
            className="rs-tab inline-flex flex-1 items-center justify-center text-center no-underline"
          >
            Schedule
          </Link>
        </nav>

        {tab === "list" ? (
          <div
            role="tabpanel"
            className="flex-1 bg-white px-[15px] pb-4 pt-0"
            id="view-list"
          >
            {focusSlots.length === 0 ? (
              <p className="text-center text-sm text-[#666]">No slots yet.</p>
            ) : (
              focusSlots.map((slot) => {
                const meta = activityMeta(slot.activity_type);
                const bullets = bulletsFromRow(slot);
                return (
                  <Link
                    key={slot.id}
                    href={`/runsheet/${id}/activity/${slot.id}`}
                    className="rs-card mb-3 block w-full cursor-pointer text-left font-[inherit] text-inherit no-underline transition hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a90e2]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rs-date-badge flex min-w-[4.5rem] flex-col gap-0.5 py-2">
                        <span className="tabular-nums">{slotHm(slot.start_at, tz)}</span>
                        <span className="text-[0.65rem] font-bold text-[#999]">→</span>
                        <span className="tabular-nums">
                          {slot.open_ended ? (
                            <span className="text-[0.7rem] font-bold text-[#999]">open</span>
                          ) : (
                            slotHm(slot.end_at, tz)
                          )}
                        </span>
                      </div>
                      <div
                        className="min-w-0 flex-1 border-l-[4px] pl-3"
                        style={{
                          borderColor: meta.border,
                          background: `linear-gradient(90deg,${meta.tint} 0%,#fff 12%)`,
                        }}
                      >
                        <p className="text-[0.9rem] font-bold leading-snug">
                          {slot.title ?? "Untitled"}
                        </p>
                        {slot.description ? (
                          <p className="mt-1 text-[0.8rem] text-[#666]">{slot.description}</p>
                        ) : null}
                        {bullets.length ? (
                          <ul
                            className="mt-2 space-y-1 border-l-2 pl-3 text-[0.78rem] leading-relaxed text-[#666]"
                            style={{ borderColor: "#4a90e2" }}
                          >
                            {bullets.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      {slot.preview_image_url ? (
                        <div
                          className="h-12 w-12 shrink-0 rounded-lg bg-[#f0f0f0] bg-cover bg-center"
                          style={{ backgroundImage: `url(${slot.preview_image_url})` }}
                        />
                      ) : null}
                    </div>
                  </Link>
                );
              })
            )}

            <div className="mt-6 border-t border-[#eeeeee] pt-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
                Checklist
              </p>
              <h3 className="mt-1 text-[0.95rem] font-bold text-[#333]">Day tasks</h3>
              <ul className="mt-3 space-y-2 text-[0.8rem] text-[#555]">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <form action={toggleChecklistItem} className="inline">
                      <input type="hidden" name="runsheet_id" value={id} />
                      <input type="hidden" name="item_id" value={item.id} />
                      <input type="hidden" name="done" value={item.done ? "false" : "true"} />
                      <button
                        type="submit"
                        className="mt-0.5 font-[inherit] text-[#ccc]"
                        aria-label={item.done ? "Mark not done" : "Mark done"}
                      >
                        {item.done ? "☑" : "☐"}
                      </button>
                    </form>
                    <span className={item.done ? "text-[#aaa] line-through" : ""}>{item.label}</span>
                  </li>
                ))}
              </ul>
              {focusDay ? (
                <form action={addChecklistItem} className="mt-3 flex gap-2">
                  <input type="hidden" name="runsheet_id" value={id} />
                  <input type="hidden" name="day_id" value={focusDay.id} />
                  <input
                    name="label"
                    placeholder="Add item"
                    className="min-w-0 flex-1 rounded-xl border border-[#eeeeee] px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#4a90e2] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Add
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            role="tabpanel"
            className="flex-1 bg-white px-2 pb-4 pt-0"
            id="view-schedule"
          >
            <div
              className="no-print mx-1 mb-3 flex gap-1 rounded-[10px] bg-[#f0f0f0] p-1"
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
                <p className="mb-2 px-1 text-center text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
                  {DateTime.fromISO(focusYmd, { zone: tz }).toFormat("ccc d MMM")} · by hour
                </p>
                <div
                  className="mx-auto grid max-w-full grid-cols-[2.75rem_1fr] overflow-hidden rounded-xl border border-[#eeeeee]"
                  style={{ minHeight: HOURS.length * HOUR_PX }}
                >
                  <div className="bg-[#fafafa] py-1 pr-0.5">
                    {HOURS.map((h) => (
                      <div key={h} className="rs-hour">
                        {String(h).padStart(2, "0")}
                      </div>
                    ))}
                  </div>
                  <div className="relative border-l border-[#eeeeee] bg-white">
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="border-b border-[#eeeeee]"
                        style={{ height: HOUR_PX }}
                      />
                    ))}
                    {focusSlots.map((slot) => {
                      const meta = activityMeta(slot.activity_type);
                      const start = DateTime.fromISO(slot.start_at, { zone: "utc" }).setZone(tz);
                      const end = DateTime.fromISO(slot.end_at, { zone: "utc" }).setZone(tz);
                      const startH = start.hour + start.minute / 60;
                      const endH = end.hour + end.minute / 60;
                      const top = Math.max(0, (startH - GRID_START_HOUR) * HOUR_PX);
                      const height = Math.max(
                        24,
                        (Math.min(GRID_END_HOUR, endH) - Math.max(GRID_START_HOUR, startH)) *
                          HOUR_PX,
                      );
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
                          <span className="block truncate text-[#333]">
                            {slotHm(slot.start_at, tz)}–{slot.open_ended ? "open" : slotHm(slot.end_at, tz)}
                          </span>
                          <span className="block truncate text-[0.65rem] font-bold text-[#666]">
                            {slot.title}
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
                        <h3 className="text-[0.85rem] font-bold text-[#333]">{title}</h3>
                        {drow?.label ? (
                          <span className="text-[0.65rem] font-bold text-[#999]">{drow.label}</span>
                        ) : null}
                      </div>
                      {rows.length === 0 ? (
                        <p className="text-[0.78rem] text-[#999]">No slots</p>
                      ) : (
                        <ul className="space-y-2">
                          {rows.map((slot) => (
                            <li key={slot.id} className="text-[0.78rem]">
                              <Link
                                href={`/runsheet/${id}/activity/${slot.id}`}
                                className="font-bold text-[#333] no-underline hover:text-[#4a90e2]"
                              >
                                {slotHm(slot.start_at, tz)}–
                                {slot.open_ended ? "open" : slotHm(slot.end_at, tz)} · {slot.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isOwner ? (
          <div className="no-print border-t border-[#eeeeee] px-3 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">Invite</p>
            <form action={inviteToRunsheet} className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="runsheet_id" value={id} />
              <input
                name="email"
                type="email"
                required
                placeholder="partner@email.com"
                className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
              />
              <select
                name="role"
                className="rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
                defaultValue="editor"
              >
                <option value="editor">Can edit</option>
                <option value="viewer">View only</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-[#4a90e2] py-2 text-sm font-bold text-white"
              >
                Send invite
              </button>
            </form>
            {invites.length ? (
              <ul className="mt-2 space-y-1 text-[0.72rem] text-[#666]">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex justify-between gap-2">
                    <span>{inv.email}</span>
                    <span className="shrink-0 font-mono text-[0.62rem] text-[#999]">
                      {site ? (
                        <Link className="text-[#4a90e2]" href={`/invite/${inv.token}`}>
                          link
                        </Link>
                      ) : (
                        `/invite/${inv.token}`
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="no-print fixed bottom-0 left-0 right-0 z-10 flex justify-center bg-gradient-to-t from-[#fcfcfc] via-[#fcfcfc] to-transparent p-3 pb-4">
          <Link
            href={`/runsheet/${id}/new?day=${focusYmd}`}
            className="rs-add-btn w-full max-w-[450px] no-underline"
          >
            + Add slot
          </Link>
        </div>
      </div>
    </div>
  );
}
