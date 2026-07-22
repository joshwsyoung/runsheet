import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/cached-session";

/**
 * Free-text place → coordinates, via OpenStreetMap's Nominatim.
 *
 * Proxied rather than called from the browser so we can send a real User-Agent and
 * cache the result, which their usage policy asks for. Nominatim is free but rate
 * limited to roughly one request a second, so results are cached hard: place names on
 * a trip do not move.
 */
export const revalidate = 86_400;

type NominatimHit = { lat: string; lon: string; display_name: string };

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "runsheet-trip-planner (https://runsheet-six.vercel.app)",
        "Accept-Language": "en",
      },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "geocode_failed" }, { status: 502 });
    }
    const hits = (await res.json()) as NominatimHit[];
    const hit = hits[0];
    if (!hit) return NextResponse.json({ found: false });

    return NextResponse.json(
      {
        found: true,
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        label: hit.display_name,
      },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
    );
  } catch {
    return NextResponse.json({ error: "geocode_failed" }, { status: 502 });
  }
}
