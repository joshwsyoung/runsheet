import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/cached-session";

/**
 * Free-text place → coordinates, via OpenStreetMap's Nominatim.
 *
 * Two shapes come out of the same endpoint:
 *   - default (limit 1): the single best hit, used by the fallback map to drop a pin.
 *   - search (limit > 1): a ranked list of candidates, used by the searchable From /
 *     To / Location fields so a person can disambiguate "Heathrow T2" — which matches
 *     a dozen near-identical places — down to the one point they mean, once.
 *
 * Proxied rather than called from the browser so we can send a real User-Agent and
 * cache the result, which their usage policy asks for. Nominatim is free but rate
 * limited to roughly one request a second, so results are cached hard: place names on
 * a trip do not move.
 */
export const revalidate = 86_400;

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
  class?: string;
  type?: string;
  address?: Record<string, string>;
};

type Candidate = {
  lat: number;
  lng: number;
  /** Short, human-readable name for the field value and the dropdown row. */
  name: string;
  /** Locality + country, for telling near-identical candidates apart. */
  context: string;
  /** Full Nominatim label, kept for a title/tooltip. */
  label: string;
};

/** The most specific place-ish name Nominatim gave us, without the full address tail. */
function primaryName(hit: NominatimHit): string {
  const a = hit.address ?? {};
  const preferred =
    a.aeroway ||
    a.terminal ||
    a.name ||
    a.attraction ||
    a.tourism ||
    a.building ||
    a.amenity ||
    a.railway ||
    a.aerodrome;
  if (preferred) return preferred;
  // Fall back to the first comma-segment of the display name.
  return hit.display_name.split(",")[0]?.trim() || hit.display_name;
}

/** City / country context that distinguishes otherwise-identical candidate names. */
function contextLabel(hit: NominatimHit): string {
  const a = hit.address ?? {};
  const locality = a.city || a.town || a.village || a.municipality || a.county || a.state;
  const country = a.country;
  return [locality, country].filter(Boolean).join(", ");
}

function toCandidate(hit: NominatimHit): Candidate {
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    name: primaryName(hit),
    context: contextLabel(hit),
    label: hit.display_name,
  };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });

  // limit=1 keeps the original single-hit contract; a search asks for more candidates.
  const requested = Number(params.get("limit") ?? "1");
  const limit = Number.isFinite(requested) ? Math.min(Math.max(1, requested), 8) : 1;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));

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

    // Nominatim already orders by importance, so the first hit is the most reliable
    // interpretation — exactly what we want for "the most likely place".
    const candidates = hits.map(toCandidate);
    const top = candidates[0];

    const headers = { "Cache-Control": "public, max-age=86400, s-maxage=86400" };

    if (!top) {
      return NextResponse.json({ found: false, candidates: [] }, { headers });
    }

    return NextResponse.json(
      {
        found: true,
        // Back-compat single-hit fields (the fallback map still reads these).
        lat: top.lat,
        lng: top.lng,
        label: top.label,
        // Ranked candidates for the searchable fields.
        candidates,
      },
      { headers },
    );
  } catch {
    return NextResponse.json({ error: "geocode_failed" }, { status: 502 });
  }
}
