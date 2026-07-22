"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

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

/**
 * Fallback map, used when no Google Maps key is configured.
 *
 * A small Leaflet map for a slot.
 *
 * Two places (a taxi, a drive, a flight) get both pins and a line between them; one
 * place gets a single pin. The line is a direct great-circle-ish hop, not a driving
 * route — drawing a real route needs a routing service, and pretending a straight line
 * is your road route would be misleading.
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
}: {
  from?: string | null;
  to?: string | null;
  single?: string | null;
  fromCoords?: LatLng | null;
  toCoords?: LatLng | null;
  singleCoords?: LatLng | null;
  accent: string;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

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
        L.polyline(
          found.map((p) => [p.lat, p.lng] as [number, number]),
          { color: accent, weight: 3, opacity: 0.75, dashArray: "6 6" },
        ).addTo(map);
        map.fitBounds(
          L.latLngBounds(found.map((p) => [p.lat, p.lng] as [number, number])),
          { padding: [28, 28] },
        );
      } else {
        map.setView([found[0]!.lat, found[0]!.lng], 14);
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
    fromCoords?.lat,
    fromCoords?.lng,
    toCoords?.lat,
    toCoords?.lng,
    singleCoords?.lat,
    singleCoords?.lng,
  ]);

  if (state === "empty") return null;

  return (
    <section className="overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface">
      <div ref={holder} className="h-48 w-full bg-rs-fill" />
      {from && to ? (
        <p className="border-t border-rs-border px-3 py-1.5 text-[0.68rem] text-rs-label">
          Direct line between the two places, not a driving route.
        </p>
      ) : null}
    </section>
  );
}
