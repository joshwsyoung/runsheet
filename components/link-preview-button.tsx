"use client";

import { useState } from "react";

export function LinkPreviewButton({ slotId }: { slotId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/slots/${slotId}/preview`, { method: "POST" });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setMessage("Could not refresh preview.");
      } else {
        window.location.reload();
      }
    } catch {
      setMessage("Could not refresh preview.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="rounded-xl border border-rs-border bg-rs-surface px-3 py-2 text-xs font-bold text-rs-primary disabled:opacity-50"
      >
        {loading ? "Fetching…" : "Refresh link preview"}
      </button>
      {message ? <p className="text-xs text-rs-muted">{message}</p> : null}
    </div>
  );
}
