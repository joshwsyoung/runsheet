"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { normalizeActivityType } from "@/lib/activity-types";
import { mapsDirections } from "@/lib/places";

type Point = { lat: number; lng: number; label: string };

async function geocode(q: string): Promise<Point | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.found ? { lat: data.lat, lng: data.lng, label: data.label } : null;
  } catch {
    return null;
  }
}

type RoadRoute = { line: [number, number][]; durationSec: number | null };

/** Road route geometry + duration between two points, or null if routing is unavailable. */
async function fetchRoute(a: Point, b: Point): Promise<RoadRoute | null> {
  try {
    const res = await fetch(`/api/route?from=${a.lat},${a.lng}&to=${b.lat},${b.lng}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.found || !Array.isArray(data.line) || data.line.length < 2) return null;
    return { line: data.line, durationSec: typeof data.duration === "number" ? data.duration : null };
  } catch {
    return null;
  }
}

/** Great-circle distance between two points, in kilometres. */
function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Rough flight time: cruise ~800 km/h plus a fixed allowance for taxi/climb/descent. */
function flightMinutes(a: Point, b: Point): number {
  return (haversineKm(a, b) / 800) * 60 + 40;
}

/** Human duration from minutes: "35 min", "1 h 20 min". */
function formatMinutes(mins: number): string {
  const m = Math.max(1, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${rem} min` : `${h} h`;
}

/** A point as the "lat,lng" string Maps directions accept. */
function coordStr(c: LatLng | null | undefined): string | null {
  return c ? `${c.lat},${c.lng}` : null;
}

/** Activity types where a road route makes sense (a plane does not follow roads). */
function usesRoadRoute(activityType: string | null | undefined): boolean {
  const t = normalizeActivityType(activityType);
  return t === "taxi" || t === "driving" || t === "rental_car";
}

/** The route line colour. */
const ROUTE_BLUE = "#2f6fed";

/**
 * A gently arched line between two points, so a flight reads as a flight rather than a
 * ruler-straight hop. A quadratic curve whose control point is pushed perpendicular to
 * the line; not geographically exact, just a friendlier shape.
 */
function arcPoints(a: Point, b: Point, curvature = 0.18, steps = 48): [number, number][] {
  const midLat = (a.lat + b.lat) / 2;
  const midLng = (a.lng + b.lng) / 2;
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const dist = Math.hypot(dLat, dLng) || 0.0001;

  // Perpendicular to the line, normalised, flipped to always arch upward (toward higher
  // latitude) so the curve is consistent whichever way the journey runs.
  let perpLat = -dLng;
  let perpLng = dLat;
  const perpLen = Math.hypot(perpLat, perpLng) || 1;
  perpLat /= perpLen;
  perpLng /= perpLen;
  if (perpLat < 0) {
    perpLat = -perpLat;
    perpLng = -perpLng;
  }

  const off = curvature * dist;
  const ctrlLat = midLat + perpLat * off;
  const ctrlLng = midLng + perpLng * off;

  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const lat = u * u * a.lat + 2 * u * t * ctrlLat + t * t * b.lat;
    const lng = u * u * a.lng + 2 * u * t * ctrlLng + t * t * b.lng;
    pts.push([lat, lng]);
  }
  return pts;
}

/**
 * A small Leaflet map for a slot. Used for all routes, and for single places when no
 * Google Maps key is configured.
 *
 * Two places get both pins and a line between them; one place gets a single pin. For
 * driving-type journeys the line follows real roads via OSRM; if routing is unavailable
 * (or the trip is a flight) it falls back to a direct line, labelled as such so a
 * straight hop is never mistaken for a road route.
 *
 * Leaflet is loaded on demand so it stays out of the main bundle, and markers are
 * divIcons so there are no missing marker-image assets to chase.
 */
type LatLng = { lat: number; lng: number };

/** A pinned coordinate needs no lookup; otherwise fall back to geocoding the name. */
async function resolvePoint(
  coord: LatLng | null | undefined,
  text: string | null | undefined,
): Promise<Point | null> {
  if (coord) return { lat: coord.lat, lng: coord.lng, label: text?.trim() || "Pinned location" };
  const q = text?.trim();
  return q ? geocode(q) : null;
}

export function SlotMapLeaflet({
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
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");
  const [routeKind, setRouteKind] = useState<"road" | "line" | "flight" | null>(null);
  const [travelLabel, setTravelLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const isRoute = Boolean((from || fromCoords) && (to || toCoords));
      // Each place resolves from its pinned coordinate first, name only as a fallback.
      const lookups = isRoute
        ? [resolvePoint(fromCoords, from), resolvePoint(toCoords, to)]
        : [resolvePoint(singleCoords ?? fromCoords ?? toCoords, single || from || to)];

      const [L, ...points] = await Promise.all([
        import("leaflet").then((m) => m.default ?? m),
        ...lookups,
      ]);
      if (cancelled) return;

      const found = points.filter((p): p is Point => Boolean(p));
      if (found.length === 0 || !holder.current) {
        setState("empty");
        return;
      }

      mapRef.current?.remove();
      const map = L.map(holder.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const pin = (color: string) =>
        L.divIcon({
          className: "",
          html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.9),0 1px 4px rgba(0,0,0,.4)"></span>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

      found.forEach((p, i) => {
        L.marker([p.lat, p.lng], {
          icon: pin(found.length > 1 && i === 0 ? "#95a5a6" : accent),
        })
          .addTo(map)
          .bindPopup(p.label);
      });

      if (found.length > 1) {
        const straight = found.map((p) => [p.lat, p.lng] as [number, number]);
        const isFlight = normalizeActivityType(activityType) === "flight";

        // Try a real road route for driving-type journeys; fall back to a direct line
        // (arched for flights).
        const road = usesRoadRoute(activityType)
          ? await fetchRoute(found[0]!, found[1]!)
          : null;
        if (cancelled || mapRef.current !== map) return;

        if (road) {
          L.polyline(road.line, { color: ROUTE_BLUE, weight: 4, opacity: 0.9 }).addTo(map);
          map.fitBounds(L.latLngBounds(road.line), { padding: [28, 28] });
          setRouteKind("road");
          setTravelLabel(road.durationSec != null ? formatMinutes(road.durationSec / 60) : null);
        } else if (isFlight) {
          const arc = arcPoints(found[0]!, found[1]!);
          L.polyline(arc, {
            color: ROUTE_BLUE,
            weight: 3,
            opacity: 0.9,
            dashArray: "7 7",
          }).addTo(map);
          map.fitBounds(L.latLngBounds(arc), { padding: [28, 28] });
          setRouteKind("flight");
          setTravelLabel(formatMinutes(flightMinutes(found[0]!, found[1]!)));
        } else {
          L.polyline(straight, {
            color: ROUTE_BLUE,
            weight: 3,
            opacity: 0.8,
            dashArray: "6 6",
          }).addTo(map);
          map.fitBounds(L.latLngBounds(straight), { padding: [28, 28] });
          setRouteKind("line");
          setTravelLabel(null);
        }
      } else {
        map.setView([found[0]!.lat, found[0]!.lng], 14);
        setRouteKind(null);
        setTravelLabel(null);
      }

      // The container is sized by CSS after mount; Leaflet needs telling.
      setTimeout(() => map.invalidateSize(), 0);
      setState("ready");
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Depend on primitive coordinate values, not the object identities, so a re-render
    // that rebuilds equal coordinate objects does not needlessly rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    from,
    to,
    single,
    accent,
    activityType,
    fromCoords?.lat,
    fromCoords?.lng,
    toCoords?.lat,
    toCoords?.lng,
    singleCoords?.lat,
    singleCoords?.lng,
  ]);

  if (state === "empty") return null;

  const isRoute = Boolean((from || fromCoords) && (to || toCoords));
  const destination =
    coordStr(toCoords) ||
    to?.trim() ||
    coordStr(singleCoords) ||
    single?.trim() ||
    coordStr(fromCoords) ||
    from?.trim() ||
    null;
  const origin = isRoute ? coordStr(fromCoords) || from?.trim() || null : null;
  const directionsHref = mapsDirections({ origin, destination });

  const note =
    routeKind === "road"
      ? "Driving route"
      : routeKind === "flight"
        ? "Approximate flight path"
        : routeKind === "line"
          ? "Direct line, not a driving route"
          : null;
  const noteText = [note, travelLabel ? `~${travelLabel}` : null].filter(Boolean).join(" · ");

  return (
    <section className="overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface">
      <div ref={holder} className="h-48 w-full bg-rs-fill" />
      {noteText || directionsHref ? (
        <div className="flex items-center justify-between gap-2 border-t border-rs-border px-3 py-1.5">
          <p className="min-w-0 truncate text-[0.68rem] text-rs-label">{noteText}</p>
          {directionsHref ? (
            <a
              href={directionsHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[0.72rem] font-bold text-rs-primary no-underline"
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              Directions
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
