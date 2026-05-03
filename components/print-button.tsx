"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-[#eeeeee] bg-white px-3 py-1.5 text-xs font-bold text-[#555] shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
    >
      Print
    </button>
  );
}
