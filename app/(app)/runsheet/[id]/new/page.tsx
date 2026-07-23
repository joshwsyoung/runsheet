import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { createClient } from "@/lib/supabase/server";
import { clampYmdToRange, todayYmdInTz } from "@/lib/dates";
import { createSlotFromForm } from "@/app/actions/slots";
import { SlotCoreFields } from "@/components/slot-core-fields";

export default async function NewSlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { id } = await params;
  const { day: dayParam } = await searchParams;
  const supabase = await createClient();
  const { data: rs } = await supabase
    .from("runsheets")
    .select("id, title, timezone, start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  if (!rs) notFound();
  const tz = rs.timezone || "UTC";
  const requestedDay =
    dayParam && dayParam.length >= 8 ? dayParam : todayYmdInTz(tz);
  const defaultDayYmd = clampYmdToRange(
    requestedDay,
    rs.start_date,
    rs.end_date,
    tz,
  );
  const dayLabel = DateTime.fromISO(defaultDayYmd, { zone: tz }).toFormat("ccc d MMM yyyy");

  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-10 sm:p-2.5">
      <div className="w-full max-w-[450px] space-y-4 pt-2 sm:pt-4">
        <div className="flex items-center justify-end">
          <span className="text-xs font-bold uppercase tracking-wide text-rs-label">New slot</span>
        </div>
        <form action={createSlotFromForm} className="rs-card space-y-3 p-4 sm:p-5">
          <input type="hidden" name="runsheet_id" value={id} />
          <input type="hidden" name="timezone" value={tz} />
          <SlotCoreFields
            startDateMin={rs.start_date}
            endDateMax={rs.end_date}
            defaultStartDayYmd={defaultDayYmd}
            defaultEndDayYmd={defaultDayYmd}
            defaultStartHm="09:00"
            defaultEndHm=""
          />
          <p className="text-[0.72rem] leading-snug text-rs-muted">
            Defaults to the day you were viewing ({dayLabel}). Use start/end day + time to capture multi-day plans.
          </p>
          <label className="flex items-center gap-2 text-sm font-bold text-rs-secondary">
            <input type="checkbox" name="open_end" className="h-4 w-4" />
            Open end
          </label>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              To-dos (one per line)
            </label>
            <textarea
              name="todos"
              rows={3}
              placeholder={"Book taxi\nFind a restaurant"}
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[0.72rem] text-rs-muted">Things still to sort before this activity is ready.</p>
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              About
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Bullets (one per line)
            </label>
            <textarea
              name="bullets"
              rows={3}
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Link
            </label>
            <input
              name="link_url"
              type="url"
              placeholder="https://"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Booking ref
            </label>
            <input
              name="booking_ref"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Contact
            </label>
            <input
              name="contact_info"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
              Boarding passes / QR links (one per line)
            </label>
            <textarea
              name="attachment_urls"
              rows={3}
              placeholder={"https://airline.com/pass/ABC123\nhttps://wallet.example/qr/..."}
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-rs-primary py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
          >
            Save slot
          </button>
        </form>
      </div>
    </div>
  );
}
