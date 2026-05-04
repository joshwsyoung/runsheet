import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayYmdInTz } from "@/lib/dates";
import { createSlotFromForm } from "@/app/actions/slots";
import { ACTIVITY_TYPES, activityMeta } from "@/lib/activity-types";

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
    .select("id, title, timezone")
    .eq("id", id)
    .maybeSingle();
  if (!rs) notFound();
  const tz = rs.timezone || "UTC";
  const dayYmd = dayParam && dayParam.length >= 8 ? dayParam : todayYmdInTz(tz);

  return (
    <div className="flex min-h-dvh justify-center bg-[#fcfcfc] p-0 pb-10 sm:p-2.5">
      <div className="w-full max-w-[450px] space-y-4 pt-2 sm:pt-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/runsheet/${id}?day=${dayYmd}`}
            className="text-sm font-bold text-[#777] no-underline hover:text-[#4a90e2]"
          >
            ← Back
          </Link>
          <span className="text-xs font-bold uppercase tracking-wide text-[#999]">New slot</span>
        </div>
        <form action={createSlotFromForm} className="rs-card space-y-3">
          <input type="hidden" name="runsheet_id" value={id} />
          <input type="hidden" name="day_ymd" value={dayYmd} />
          <input type="hidden" name="timezone" value={tz} />
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Title
            </label>
            <input
              name="title"
              required
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Type
            </label>
            <select
              name="activity_type"
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
              defaultValue="other"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {activityMeta(t).label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
                Start
              </label>
              <input
                name="start_hm"
                type="time"
                defaultValue="09:00"
                className="w-full rounded-xl border border-[#eeeeee] px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
                End
              </label>
              <input
                name="end_hm"
                type="time"
                className="w-full rounded-xl border border-[#eeeeee] px-2 py-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-[#555]">
            <input type="checkbox" name="open_end" className="h-4 w-4" />
            Open end
          </label>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              About
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Bullets (one per line)
            </label>
            <textarea
              name="bullets"
              rows={3}
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Link
            </label>
            <input
              name="link_url"
              type="url"
              placeholder="https://"
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Booking ref
            </label>
            <input
              name="booking_ref"
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-[#999]">
              Contact
            </label>
            <input
              name="contact_info"
              className="w-full rounded-xl border border-[#eeeeee] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#4a90e2] py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
          >
            Save slot
          </button>
        </form>
      </div>
    </div>
  );
}
