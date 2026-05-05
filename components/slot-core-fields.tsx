"use client";

import { useMemo, useState } from "react";
import { ACTIVITY_TYPES, activityMeta, type ActivityType } from "@/lib/activity-types";

type Props = {
  startDateMin: string;
  endDateMax: string;
  defaultStartDayYmd: string;
  defaultEndDayYmd: string;
  defaultStartHm: string;
  defaultEndHm: string;
  defaultType?: string | null;
  defaultTitle?: string | null;
  defaultFromLocation?: string | null;
  defaultToLocation?: string | null;
  defaultFlightNumber?: string | null;
  defaultLocationName?: string | null;
  defaultMapUrl?: string | null;
};

export function SlotCoreFields({
  startDateMin,
  endDateMax,
  defaultStartDayYmd,
  defaultEndDayYmd,
  defaultStartHm,
  defaultEndHm,
  defaultType,
  defaultTitle,
  defaultFromLocation,
  defaultToLocation,
  defaultFlightNumber,
  defaultLocationName,
  defaultMapUrl,
}: Props) {
  const [activityType, setActivityType] = useState<ActivityType>(
    (ACTIVITY_TYPES as readonly string[]).includes(defaultType ?? "")
      ? (defaultType as ActivityType)
      : "other",
  );

  const titleLabel = useMemo(() => {
    if (activityType === "activity" || activityType === "other") return "Title";
    if (activityType === "flight") return "Flight title";
    if (activityType === "taxi") return "Ride title";
    return "Title";
  }, [activityType]);

  return (
    <>
      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
          What are we doing?
        </label>
        <select
          name="activity_type"
          className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
          defaultValue={activityType}
          onChange={(e) => setActivityType(e.target.value as ActivityType)}
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {activityMeta(t).label}
            </option>
          ))}
        </select>
      </div>

      {(activityType === "flight" || activityType === "taxi" || activityType === "driving") && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
              From
            </span>
            <input
              name="from_location"
              defaultValue={defaultFromLocation ?? ""}
              placeholder="Origin"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
              To
            </span>
            <input
              name="to_location"
              defaultValue={defaultToLocation ?? ""}
              placeholder="Destination"
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {activityType === "flight" && (
        <label>
          <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
            Flight number
          </span>
          <input
            name="flight_number"
            defaultValue={defaultFlightNumber ?? ""}
            placeholder="BA286"
            className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
          />
        </label>
      )}

      {(activityType === "dinner" ||
        activityType === "lunch" ||
        activityType === "breakfast" ||
        activityType === "activity") && (
        <label>
          <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
            Location name
          </span>
          <input
            name="location_name"
            defaultValue={defaultLocationName ?? ""}
            placeholder="Restaurant, beach, museum..."
            className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
          />
        </label>
      )}

      <div>
        <label className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
          {titleLabel}
        </label>
        <input
          name="title"
          required
          defaultValue={defaultTitle ?? ""}
          className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">
          Start and end
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
          <label>
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Start day</span>
            <input
              type="date"
              name="start_day_ymd"
              required
              min={startDateMin}
              max={endDateMax}
              defaultValue={defaultStartDayYmd}
              className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
            />
          </label>
          <label>
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Start time</span>
            <input
              name="start_hm"
              type="time"
              defaultValue={defaultStartHm}
              className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm"
            />
          </label>
          <label>
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">End day</span>
            <input
              type="date"
              name="end_day_ymd"
              required
              min={startDateMin}
              max={endDateMax}
              defaultValue={defaultEndDayYmd}
              className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
            />
          </label>
          <label>
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">End time</span>
            <input
              name="end_hm"
              type="time"
              defaultValue={defaultEndHm}
              className="w-full rounded-xl border border-rs-border px-2 py-2 text-sm"
            />
          </label>
        </div>
        <p className="mt-1 text-[0.72rem] leading-snug text-rs-muted">
          Overnight works too. You can set an end day and end time explicitly.
        </p>
      </div>

      <label>
        <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Map link (Google/Apple)</span>
        <input
          name="map_url"
          type="url"
          defaultValue={defaultMapUrl ?? ""}
          placeholder="https://maps.google.com/..."
          className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
        />
      </label>
    </>
  );
}
