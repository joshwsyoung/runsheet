"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function runsheetIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/runsheet\/([^/]+)/);
  return m?.[1] ?? null;
}

export function AppHeader() {
  const pathname = usePathname();
  const runsheetId = runsheetIdFromPath(pathname);
  const onRunsheet = Boolean(runsheetId);

  return (
    <header className="no-print sticky top-0 z-20 border-b border-rs-border bg-rs-surface/95 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-[760px] items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-1.5">
          <Link href="/dashboard" className="rs-btn rs-btn-secondary rs-btn-sm no-underline">
            Dashboard
          </Link>
          {onRunsheet ? (
            <Link href={`/runsheet/${runsheetId}/settings`} className="rs-btn rs-btn-secondary rs-btn-sm no-underline">
              Settings
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {onRunsheet ? (
            <Link href={`/runsheet/${runsheetId}`} className="rs-btn rs-btn-secondary rs-btn-sm no-underline">
              Back
            </Link>
          ) : null}
          <Link href="/account" className="rs-btn rs-btn-secondary rs-btn-sm no-underline">
            Account
          </Link>
        </div>
      </div>
    </header>
  );
}
