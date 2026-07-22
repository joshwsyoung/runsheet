import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/cached-session";
import { upsertRunsheetDays } from "@/lib/runsheet-days";
import { todayYmdInTz, eachYmdInclusive, clampYmdToRange } from "@/lib/dates";
import type { Database } from "@/lib/database.types";
import { RunsheetApp, type DayPayload } from "@/components/runsheet-app";
import { RunsheetMoreMenu } from "@/components/runsheet-more-menu";
import { TripHeroImage } from "@/components/trip-hero-image";

type DayRow = Database["public"]["Tables"]["runsheet_days"]["Row"];
type SlotRow = Database["public"]["Tables"]["slots"]["Row"];
type CheckRow = Database["public"]["Tables"]["checklist_items"]["Row"];

/**
 * Server half of the runsheet: authenticate, load the whole trip once, hand it to the
 * client view. Everything the user does afterwards — switching views, jumping days,
 * ticking things off — is client-side and costs no round trip.
 */
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
  const carouselMin =
    DateTime.fromISO(runsheet.start_date, { zone: tz }).minus({ days: 1 }).toISODate() ??
    runsheet.start_date;
  const carouselMax =
    DateTime.fromISO(runsheet.end_date, { zone: tz }).plus({ days: 1 }).toISODate() ??
    runsheet.end_date;
  const labels = eachYmdInclusive(carouselMin, carouselMax, tz);

  const { data: dayData } = await supabase
    .from("runsheet_days")
    .select("id, day_date, label, is_special, status")
    .eq("runsheet_id", id)
    .in("day_date", labels)
    .order("day_date", { ascending: true });

  let dayList = (dayData ?? []) as DayRow[];

  // Only write when a day is genuinely absent. This used to run a select+upsert on every
  // single page load, which bought nothing after the first visit.
  const missing = labels.filter((ymd) => !dayList.some((d) => d.day_date === ymd));
  if (missing.length > 0) {
    await upsertRunsheetDays(supabase, id, missing);
    const { data: refetched } = await supabase
      .from("runsheet_days")
      .select("id, day_date, label, is_special, status")
      .eq("runsheet_id", id)
      .in("day_date", labels)
      .order("day_date", { ascending: true });
    dayList = (refetched ?? dayList) as DayRow[];
  }

  const dayIds = dayList.map((d) => d.id);

  const [slotsRes, checklistRes, ideasRes] = await Promise.all([
    dayIds.length
      ? supabase.from("slots").select("*").in("day_id", dayIds).order("start_at", { ascending: true })
      : Promise.resolve({ data: null as SlotRow[] | null }),
    dayIds.length
      ? supabase
          .from("checklist_items")
          .select("*")
          .in("day_id", dayIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: null as CheckRow[] | null }),
    supabase.from("trip_ideas").select("id").eq("runsheet_id", id),
  ]);

  const days: DayPayload[] = dayList.map((d) => ({
    id: d.id,
    ymd: d.day_date,
    label: d.label,
    status: d.status ?? "free",
  }));

  const todayYmd = todayYmdInTz(tz);
  const requested =
    searchParams.day && DateTime.fromISO(searchParams.day, { zone: tz }).isValid
      ? searchParams.day
      : todayYmd;
  const focusYmd = clampYmdToRange(requested, carouselMin, carouselMax, tz);

  return (
    <div
      className="print-root flex min-h-dvh justify-center bg-rs-page p-0 pb-28 font-sans text-rs-text antialiased sm:p-2.5"
      data-print-title={runsheet.title}
    >
      <div className="relative flex w-full max-w-[450px] flex-col overflow-hidden rounded-none border-0 bg-rs-surface sm:rounded-[24px] sm:border sm:border-rs-border sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:sm:shadow-[0_12px_48px_rgba(0,0,0,0.55)]">
        <TripHeroImage src={runsheet.hero_image_url} alt={`${runsheet.title} hero`} />
        <div className="no-print absolute right-3 top-3 z-20">
          <RunsheetMoreMenu id={id} />
        </div>
        <RunsheetApp
          runsheetId={id}
          title={runsheet.title}
          tz={tz}
          startDate={runsheet.start_date}
          endDate={runsheet.end_date}
          days={days}
          slots={(slotsRes.data ?? []) as SlotRow[]}
          checklist={(checklistRes.data ?? []) as CheckRow[]}
          ideaCount={ideasRes.error ? 0 : (ideasRes.data?.length ?? 0)}
          todayYmd={todayYmd}
          initialFocusYmd={focusYmd}
          initialTab={searchParams.tab === "schedule" ? "schedule" : "list"}
          initialScheduleView={searchParams.sv === "all" ? "all" : "hours"}
        />
      </div>
    </div>
  );
}
