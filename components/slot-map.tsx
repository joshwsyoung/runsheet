import { SlotMapLeaflet } from "@/components/slot-map-leaflet";

/**
 * Map for a slot.
 *
 * Single places use the Google Maps Embed API when a key is set: free with unlimited
 * requests, it takes free-text place names directly, so places OpenStreetMap has never
 * heard of still resolve, and there is no intrusive overlay on the map.
 *
 * Two-place journeys deliberately do NOT use the Google *directions* embed. That view
 * forces a white from/to directions panel over much of the map with no way to hide it,
 * so routes render on the clean Leaflet map instead — two pins and a connecting line,
 * exact when the places are pinned to coordinates. With no key configured, everything
 * falls back to Leaflet.
 *
 * The key necessarily appears in the iframe URL; that is how the Embed API works. It
 * must be restricted by HTTP referrer and to the Maps Embed API in Google Cloud.
 */

/** A point → the unambiguous "lat,lng" query both map providers resolve exactly. */
function coordQuery(coord?: LatLng | null): string | null {
  if (!coord) return null;
  return `${coord.lat},${coord.lng}`;
}

type LatLng = { lat: number; lng: number };

export function SlotMap({
  from,
  to,
  single,
  fromCoords,
  toCoords,
  singleCoords,
  accent,
  activityType,
}: {
  from?: string | null;
  to?: string | null;
  single?: string | null;
  fromCoords?: LatLng | null;
  toCoords?: LatLng | null;
  singleCoords?: LatLng | null;
  accent: string;
  activityType?: string | null;
}) {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();

  // A pinned coordinate wins over the free-text name: "lat,lng" resolves to exactly one
  // point, so an ambiguous name like "Heathrow T2" can no longer land on the wrong place
  // or fail to place a pin at all.
  const origin = coordQuery(fromCoords) || from?.trim();
  const destination = coordQuery(toCoords) || to?.trim();
  const place = coordQuery(singleCoords) || single?.trim() || destination || origin;
  const isRoute = Boolean(origin && destination);

  // Routes, and everything when there is no key, use the clean Leaflet map — no Google
  // directions panel blocking the view.
  if (isRoute || !key) {
    return (
      <SlotMapLeaflet
        from={from}
        to={to}
        single={single}
        fromCoords={fromCoords}
        toCoords={toCoords}
        singleCoords={singleCoords}
        accent={accent}
        activityType={activityType}
      />
    );
  }
  if (!place) return null;

  const src =
    `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(place)}`;

  // Prefer the readable name in the accessible title, even when the query is coords.
  const titlePlace = single?.trim() || to?.trim() || from?.trim() || place;

  return (
    <section className="overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface">
      <iframe
        title={`Map of ${titlePlace}`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="block h-56 w-full border-0"
      />
    </section>
  );
}
