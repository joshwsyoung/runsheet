"use client";

import Link from "next/link";
import { PrintButton } from "@/components/print-button";

export function RunsheetMoreMenu({ id }: { id: string }) {
  return (
    <details className="relative">
      <summary
        className="list-none cursor-pointer rounded-lg p-2 text-rs-faint hover:bg-rs-code-bg hover:text-rs-text"
        aria-label="More actions"
      >
        ⋯
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-rs-border bg-rs-surface p-2 shadow-lg">
        <Link
          href={`/runsheet/${id}/ideas`}
          className="block rounded-lg px-3 py-2 text-sm font-bold text-rs-secondary no-underline hover:bg-rs-muted-surface"
        >
          Ideas
        </Link>
        <Link
          href={`/runsheet/${id}/settings`}
          className="block rounded-lg px-3 py-2 text-sm font-bold text-rs-secondary no-underline hover:bg-rs-muted-surface"
        >
          Settings
        </Link>
        <Link
          href="/account"
          className="block rounded-lg px-3 py-2 text-sm font-bold text-rs-secondary no-underline hover:bg-rs-muted-surface"
        >
          Account
        </Link>
        <div className="rounded-lg px-1 py-1 hover:bg-rs-muted-surface">
          <PrintButton />
        </div>
      </div>
    </details>
  );
}
