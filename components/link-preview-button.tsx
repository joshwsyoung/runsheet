"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

/**
 * Small refresh control for a slot's link preview.
 *
 * When `needsFetch` is set (the slot has a link but has never had a preview fetched),
 * it fetches once automatically on load so images and titles appear without the user
 * doing anything. The icon also lets them force a re-fetch. Uses router.refresh() to
 * pull the updated server data in place rather than a full page reload.
 */
export function LinkPreviewButton({
  slotId,
  needsFetch = false,
}: {
  slotId: string;
  needsFetch?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const autoFetched = useRef(false);

  async function refresh() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch(`/api/slots/${slotId}/preview`, { method: "POST" });
      router.refresh();
    } catch {
      /* leave the existing preview in place */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (needsFetch && !autoFetched.current) {
      autoFetched.current = true;
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsFetch]);

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={loading}
      aria-label="Refresh link preview"
      title="Refresh preview"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rs-label transition hover:text-rs-primary disabled:opacity-50"
    >
      <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
    </button>
  );
}
