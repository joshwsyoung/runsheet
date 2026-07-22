"use client";

import { useEffect } from "react";

/**
 * Deep links like /runsheet/x?day=2026-08-13 land at the top of the continuous list;
 * this pulls the right day card into view once, on mount.
 */
export function ScrollToDay({ ymd }: { ymd: string }) {
  useEffect(() => {
    const el = document.getElementById(`day-${ymd}`);
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "auto" });
  }, [ymd]);
  return null;
}
