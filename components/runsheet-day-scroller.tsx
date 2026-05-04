"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { useEffect, useRef } from "react";

export type RunsheetDayChip = { ymd: string; href: string };

type RunsheetDayScrollerProps = {
  tz: string;
  chips: RunsheetDayChip[];
  focusYmd: string;
  todayYmd: string;
};

export function RunsheetDayScroller({
  tz,
  chips,
  focusYmd,
  todayYmd,
}: RunsheetDayScrollerProps) {
  const anchorRefs = useRef<Map<string, HTMLAnchorElement | null>>(new Map());

  useEffect(() => {
    const el = anchorRefs.current.get(focusYmd);
    if (!el) return;
    el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [focusYmd, chips]);

  return (
    <div className="-mx-1 flex justify-center px-1">
      <div
        className="flex max-w-full snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Days"
      >
        {chips.map(({ ymd, href }) => {
          const dt = DateTime.fromISO(ymd, { zone: tz });
          const isFocus = ymd === focusYmd;
          const isToday = ymd === todayYmd;
          const chip = isFocus
            ? "border-2 border-[#4a90e2] bg-[#4a90e2] font-bold text-white shadow-[0_4px_12px_rgba(74,144,226,0.25)]"
            : isToday
              ? "border-2 border-[#4a90e2] bg-[#eef6ff] font-bold text-[#555] shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
              : "border border-[#eeeeee] bg-white font-bold text-[#555] shadow-[0_2px_4px_rgba(0,0,0,0.02)]";
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
              className={`flex h-[56px] w-[46px] shrink-0 snap-center flex-col items-center justify-center rounded-xl no-underline ${chip}`}
            >
              <span className="text-[0.55rem] font-bold uppercase opacity-80">{dt.toFormat("ccc")}</span>
              <span className="text-sm font-bold">{dt.toFormat("d")}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
