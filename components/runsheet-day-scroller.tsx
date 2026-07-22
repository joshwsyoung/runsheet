"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { useCallback, useEffect, useRef, useState } from "react";

export type RunsheetDayChip = {
  ymd: string;
  href: string;
  slotCount?: number;
  /** Dot colour from lib/day-status.ts — travel / work / leave / free. */
  statusDot?: string;
};

type RunsheetDayScrollerProps = {
  tz: string;
  chips: RunsheetDayChip[];
  focusYmd: string;
  todayYmd: string;
  /**
   * "link" navigates (schedule view, one day at a time).
   * "jump" scrolls the continuous day list to that day's card and tracks which day is
   * on screen — Josh wanted one scroll through the trip, with the strip as an index.
   */
  mode?: "link" | "jump";
};

export function RunsheetDayScroller({
  tz,
  chips,
  focusYmd,
  todayYmd,
  mode = "link",
}: RunsheetDayScrollerProps) {
  const anchorRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const [activeYmd, setActiveYmd] = useState(focusYmd);

  useEffect(() => {
    setActiveYmd(focusYmd);
  }, [focusYmd]);

  // Keep the active chip centred in the strip as the page scrolls past days.
  useEffect(() => {
    const el = anchorRefs.current.get(activeYmd);
    if (!el) return;
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeYmd, chips]);

  // Highlight whichever day card is currently nearest the top of the viewport.
  useEffect(() => {
    if (mode !== "jump" || typeof IntersectionObserver === "undefined") return;
    const sections = chips
      .map(({ ymd }) => document.getElementById(`day-${ymd}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) {
          setActiveYmd(visible.target.id.replace(/^day-/, ""));
        }
      },
      // Top band of the viewport, just under the sticky strip.
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [mode, chips]);

  const jumpTo = useCallback((ymd: string) => {
    const target = document.getElementById(`day-${ymd}`);
    if (!target) return;
    setActiveYmd(ymd);
    target.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  return (
    <div className="-mx-1 flex justify-center px-1">
      <div
        className="flex max-w-full snap-x gap-1 overflow-x-auto scroll-smooth pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Days"
      >
        {chips.map(({ ymd, href, slotCount = 0, statusDot }) => {
          const dt = DateTime.fromISO(ymd, { zone: tz });
          const isFocus = ymd === activeYmd;
          const isToday = ymd === todayYmd;
          const chip = isFocus
            ? "border-2 border-rs-primary bg-rs-primary font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
            : isToday
              ? "border-2 border-rs-primary bg-rs-today font-bold text-rs-secondary shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
              : "border border-rs-border bg-rs-surface font-bold text-rs-secondary shadow-[0_2px_4px_rgba(0,0,0,0.02)]";
          const shared = `relative flex h-[60px] w-[48px] shrink-0 snap-center flex-col items-center justify-center rounded-xl no-underline ${chip}`;

          const inner = (
            <>
              <span className="text-[0.55rem] font-bold uppercase opacity-80">
                {dt.toFormat("ccc")}
              </span>
              <span className="text-sm font-bold">{dt.toFormat("d")}</span>
              {statusDot ? (
                <span
                  aria-hidden
                  className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: statusDot }}
                />
              ) : null}
              {slotCount > 0 ? (
                <span
                  className={`absolute -right-1 top-0 inline-flex min-w-4 -translate-y-1/2 items-center justify-center rounded-full px-1 text-[0.58rem] font-bold ${
                    isFocus ? "bg-rs-surface text-rs-primary" : "bg-rs-primary text-white"
                  }`}
                  aria-label={`${slotCount} slots`}
                  title={`${slotCount} slots`}
                >
                  {slotCount > 9 ? "9+" : slotCount}
                </span>
              ) : null}
            </>
          );

          if (mode === "jump") {
            return (
              <button
                key={ymd}
                type="button"
                role="listitem"
                onClick={() => jumpTo(ymd)}
                ref={(node) => {
                  anchorRefs.current.set(ymd, node);
                }}
                aria-current={isFocus ? "date" : undefined}
                className={shared}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={ymd}
              role="listitem"
              href={href}
              ref={(node) => {
                anchorRefs.current.set(ymd, node);
              }}
              aria-current={isFocus ? "date" : undefined}
              data-focus={isFocus ? "true" : undefined}
              className={shared}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
