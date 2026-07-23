"use client";

import { useMemo, useState } from "react";
import { ACTIVITY_TYPES, activityMeta, type ActivityType } from "@/lib/activity-types";
import { LocationSearchField } from "@/components/location-search-field";

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
  defaultFromLat?: number | null;
  defaultFromLng?: number | null;
  defaultToLat?: number | null;
  defaultToLng?: number | null;
  defaultLocationLat?: number | null;
  defaultLocationLng?: number | null;
  defaultFlightNumber?: string | null;
  defaultLocationName?: string | null;
  defaultMapUrl?: string | null;
  defaultFlightMeta?: Record<string, string> | null;
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
  defaultFromLat,
  defaultFromLng,
  defaultToLat,
  defaultToLng,
  defaultLocationLat,
  defaultLocationLng,
  defaultFlightNumber,
  defaultLocationName,
  defaultMapUrl,
  defaultFlightMeta,
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
          <LocationSearchField
            name="from_location"
            latName="from_lat"
            lngName="from_lng"
            label="From"
            placeholder="Origin"
            defaultValue={defaultFromLocation}
            defaultLat={defaultFromLat}
            defaultLng={defaultFromLng}
          />
          <LocationSearchField
            name="to_location"
            latName="to_lat"
            lngName="to_lng"
            label="To"
            placeholder="Destination"
            defaultValue={defaultToLocation}
            defaultLat={defaultToLat}
            defaultLng={defaultToLng}
          />
        </div>
      )}

      {activityType === "flight" && (
        <div className="space-y-2 rounded-xl border border-rs-border bg-rs-muted-surface/40 p-3">
          <p className="text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Flight details</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Airline</span>
              <input
                name="flight_airline"
                defaultValue={defaultFlightMeta?.airline ?? ""}
                placeholder="British Airways"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Departure airport</span>
              <input
                name="flight_departure_airport"
                defaultValue={defaultFlightMeta?.departureAirport ?? ""}
                placeholder="LHR"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Arrival airport</span>
              <input
                name="flight_arrival_airport"
                defaultValue={defaultFlightMeta?.arrivalAirport ?? ""}
                placeholder="SFO"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Departure terminal</span>
              <input
                name="flight_departure_terminal"
                defaultValue={defaultFlightMeta?.departureTerminal ?? ""}
                placeholder="T5"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Arrival terminal</span>
              <input
                name="flight_arrival_terminal"
                defaultValue={defaultFlightMeta?.arrivalTerminal ?? ""}
                placeholder="International"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Seat</span>
              <input
                name="flight_seat"
                defaultValue={defaultFlightMeta?.seat ?? ""}
                placeholder="12A"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Gate</span>
              <input
                name="flight_gate"
                defaultValue={defaultFlightMeta?.gate ?? ""}
                placeholder="B12"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Boarding time</span>
              <input
                name="flight_boarding_time"
                defaultValue={defaultFlightMeta?.boardingTime ?? ""}
                placeholder="08:35"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">Check-in URL</span>
              <input
                name="flight_checkin_url"
                defaultValue={defaultFlightMeta?.checkInUrl ?? ""}
                placeholder="https://"
                className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>
      )}

      {(activityType === "dinner" ||
        activityType === "lunch" ||
        activityType === "breakfast" ||
        activityType === "activity") && (
        <LocationSearchField
          name="location_name"
          latName="location_lat"
          lngName="location_lng"
          label="Location name"
          placeholder="Restaurant, beach, museum..."
          defaultValue={defaultLocationName}
          defaultLat={defaultLocationLat}
          defaultLng={defaultLocationLng}
        />
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

      {/* Map link field retired — the map now resolves from the searchable locations and
          their pinned coordinates. Preserve any existing value so edits don't wipe it. */}
      <input type="hidden" name="map_url" defaultValue={defaultMapUrl ?? ""} />
    </>
  );
}
