"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";

type Candidate = {
  lat: number;
  lng: number;
  name: string;
  context: string;
  label: string;
};

type Props = {
  /** Base form field name, e.g. "from_location". Coords post as `${name}_lat` / `_lng`. */
  name: string;
  latName: string;
  lngName: string;
  label: string;
  placeholder?: string;
  defaultValue?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  /** Kept in sync so the parent can build its "search on Google Maps" link. */
  onValueChange?: (value: string) => void;
};

/**
 * A place field that searches OpenStreetMap as you type and lets you pin the exact
 * point you mean.
 *
 * Free text still works — type anything and it submits as before. But a name like
 * "Heathrow T2" matches a dozen near-identical places, and geocoding it fresh on every
 * map render can land on a different one each time, or on none, so the map fails to
 * drop a pin or draw a route. Picking a candidate here stores its coordinates in hidden
 * fields; the map then uses that exact point and a pin (and route) is guaranteed.
 *
 * Editing the text after picking clears the pin — the coordinates no longer describe
 * what is written, so we would rather re-resolve than pin the wrong spot.
 */
export function LocationSearchField({
  name,
  latName,
  lngName,
  label,
  placeholder,
  defaultValue,
  defaultLat,
  defaultLng,
  onValueChange,
}: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    defaultLat != null && defaultLng != null ? { lat: defaultLat, lng: defaultLng } : null,
  );
  const [results, setResults] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  // Debounced search. Skips the fetch right after a pick (query already matches a pin).
  const justPicked = useRef(false);
  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=6`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("geocode failed");
        const data = await res.json();
        const candidates: Candidate[] = Array.isArray(data?.candidates) ? data.candidates : [];
        setResults(candidates);
        setActive(-1);
        if (candidates.length) setOpen(true);
      } catch {
        /* aborted or offline — leave the last results in place */
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [value]);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function update(next: string) {
    setValue(next);
    setCoords(null); // typing invalidates any pinned point
    onValueChange?.(next);
  }

  function pick(c: Candidate) {
    justPicked.current = true;
    const text = c.context && !c.name.includes(c.context) ? `${c.name}, ${c.context}` : c.name;
    setValue(text);
    setCoords({ lat: c.lat, lng: c.lng });
    onValueChange?.(text);
    setOpen(false);
    setResults([]);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(results[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-wide text-rs-label">
        {label}
      </span>
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={(e) => update(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full rounded-xl border border-rs-border px-3 py-2 pr-8 text-sm"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-rs-label" aria-hidden />
          ) : coords ? (
            <Check className="h-4 w-4 text-rs-primary" aria-label="Location pinned" />
          ) : (
            <MapPin className="h-4 w-4 text-rs-label" aria-hidden />
          )}
        </span>
      </div>

      {/* Coordinates travel with the form only when a candidate was picked. */}
      <input type="hidden" name={latName} value={coords ? String(coords.lat) : ""} />
      <input type="hidden" name={lngName} value={coords ? String(coords.lng) : ""} />

      {coords ? (
        <p className="mt-1 text-[0.66rem] font-bold text-rs-primary">
          Pinned to an exact point — the map will show this reliably.
        </p>
      ) : value.trim().length >= 3 ? (
        <p className="mt-1 text-[0.66rem] text-rs-muted">
          Pick a match below to pin the exact spot (optional).
        </p>
      ) : null}

      {open && results.length ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-rs-border bg-rs-surface shadow-lg"
        >
          {results.map((c, i) => (
            <li key={`${c.lat},${c.lng},${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseEnter={() => setActive(i)}
                title={c.label}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  i === active ? "bg-rs-fill" : ""
                }`}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rs-label" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-bold text-rs-text">{c.name}</span>
                  {c.context ? (
                    <span className="block truncate text-[0.72rem] text-rs-muted">{c.context}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
