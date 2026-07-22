import { SlotMapLeaflet } from "@/components/slot-map-leaflet";
import { normalizeActivityType } from "@/lib/activity-types";

/**
 * Map for a slot.
 *
 * Prefers the Google Maps Embed API, which is free with unlimited requests and — the
 * reason it wins here — takes free-text place names directly. No geocoding step, so
 * places OpenStreetMap has never heard of still resolve, and a two-place journey gets
 * a real routed line rather than a straight hop.
 *
 * The key necessarily appears in the iframe URL; that is how the Embed API works. It
 * must be restricted by HTTP referrer and to the Maps Embed API in Google Cloud.
 *
 * With no key configured this falls back to the Leaflet + OpenStreetMap map, so the
 * app still shows something useful.
 */

/** Google Embed directions travel mode, per activity type. */
function travelMode(activityType: string | null | undefined): string {
  switch (normalizeActivityType(activityType)) {
    case "flight":
      return "flying";
    case "boat":
      return "transit";
    case "taxi":
    case "driving":
    case "rental_car":
      return "driving";
    default:
      return "driving";
  }
}

export function SlotMap({
  from,
  to,
  single,
  accent,
  activityType,
}: {
  from?: string | null;
  to?: string | null;
  single?: string | null;
  accent: string;
  activityType?: string | null;
}) {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();

  const origin = from?.trim();
  const destination = to?.trim();
  const place = single?.trim() || destination || origin;
  const isRoute = Boolean(origin && destination);

  if (!key) {
    return (
      <SlotMapLeaflet from={from} to={to} single={single} accent={accent} />
    );
  }
  if (!isRoute && !place) return null;

  const src = isRoute
    ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(key)}` +
      `&origin=${encodeURIComponent(origin!)}` +
      `&destination=${encodeURIComponent(destination!)}` +
      `&mode=${travelMode(activityType)}`
    : `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}` +
      `&q=${encodeURIComponent(place!)}`;

  return (
    <section className="overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface">
      <iframe
        title={isRoute ? `Route from ${origin} to ${destination}` : `Map of ${place}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="block h-56 w-full border-0"
      />
    </section>
  );
}
