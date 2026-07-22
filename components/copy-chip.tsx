"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * A reference you can tap to copy — booking refs and confirmation numbers are the
 * things you actually need at a desk, and retyping them off a phone is miserable.
 */
export function CopyChip({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older iOS Safari without clipboard permission — fall back to a selection copy.
      const el = document.createElement("textarea");
      el.value = value;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        return;
      } finally {
        document.body.removeChild(el);
      }
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label ?? "value"}`}
      className="group relative inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-right font-mono text-[0.82rem] text-rs-text transition active:bg-rs-fill"
    >
      <span className="min-w-0 break-all">{value}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-rs-label" aria-hidden />
      )}
      <span
        aria-live="polite"
        className={`pointer-events-none absolute -top-6 right-0 rounded-md bg-rs-text px-1.5 py-0.5 font-sans text-[0.62rem] font-bold text-rs-surface transition-all duration-200 ${
          copied ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        Copied
      </span>
    </button>
  );
}
