"use client";

import { useEffect } from "react";

/**
 * Land at the top of the page.
 *
 * Arriving from a list scrolled a long way down, the browser's scroll restoration can
 * leave the new page part-scrolled, hiding the title and actions. `token` changes per
 * slot so stepping between activities re-runs it.
 */
export function ScrollTop({ token }: { token?: string }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [token]);
  return null;
}
