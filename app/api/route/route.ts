import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/cached-session";

/**
 * Road route between two points, via OSRM (the OpenStreetMap routing engine).
 *
 * Returns the route geometry so the Leaflet map can draw a line that follows real roads
 * rather than a straight hop. Proxied and hard-cached for the same reasons as the
 * geocoder: it keeps the public OSRM demo server usage light, and a route between two
 * fixed places on a trip does not change.
 *
 * Only makes sense with coordinates, which the searchable location fields now capture.
 */
export const revalidate = 86_400;

type LatLng = { lat: number; lng: number };

function parseLatLng(raw: string | null): LatLng | null {
  if (!raw) return null;
  const [lat, lng] = raw.split(",").map((n) => Number(n.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const from = parseLatLng(params.get("from"));
  const to = parseLatLng(params.get("to"));
  if (!from || !to) return NextResponse.json({ error: "missing from/to" }, { status: 400 });

  // OSRM takes lng,lat pairs; GeoJSON geometry comes back in the same order.
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "runsheet-trip-planner (https://runsheet-six.vercel.app)" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return NextResponse.json({ found: false }, { status: 502 });
    const data = await res.json();
    const route = data?.routes?.[0];
    const raw: Array<[number, number]> | undefined = route?.geometry?.coordinates;
    if (!Array.isArray(raw) || raw.length < 2) {
      return NextResponse.json({ found: false });
    }
    // Flip to [lat, lng] for Leaflet.
    const line = raw.map(([lng, lat]) => [lat, lng] as [number, number]);
    return NextResponse.json(
      { found: true, line, distance: route.distance ?? null, duration: route.duration ?? null },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
    );
  } catch {
    return NextResponse.json({ found: false }, { status: 502 });
  }
}
