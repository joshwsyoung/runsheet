"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-rs-border bg-rs-surface px-3 py-1.5 text-xs font-bold text-rs-secondary shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
    >
      Print
    </button>
  );
}
