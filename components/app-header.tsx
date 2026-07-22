"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, User, Settings, LayoutGrid } from "lucide-react";

function runsheetIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/runsheet\/([^/]+)/);
  return m?.[1] ?? null;
}

const BTN =
  "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rs-border bg-rs-surface text-rs-secondary no-underline transition hover:text-rs-text active:bg-rs-fill";

export function AppHeader() {
  const pathname = usePathname();
  const runsheetId = runsheetIdFromPath(pathname);
  const onRunsheetRoot = Boolean(runsheetId) && /^\/runsheet\/[^/]+$/.test(pathname);
  const onDashboard = pathname === "/dashboard";

  // Back goes up one level: subpage → runsheet → dashboard.
  const backHref = runsheetId && !onRunsheetRoot ? `/runsheet/${runsheetId}` : "/dashboard";

  return (
    <header className="no-print sticky top-0 z-20 border-b border-rs-border bg-rs-surface/95 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-[760px] items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-1.5">
          {onDashboard ? null : (
            <Link href={backHref} prefetch className={BTN} aria-label="Back" title="Back">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/account" prefetch className={BTN} aria-label="Account" title="Account">
            <User className="h-[18px] w-[18px]" aria-hidden />
          </Link>
          {/* Trip settings only exists in a trip context. */}
          {runsheetId ? (
            <Link
              href={`/runsheet/${runsheetId}/settings`}
              prefetch
              className={BTN}
              aria-label="Trip settings"
              title="Trip settings"
            >
              <Settings className="h-[18px] w-[18px]" aria-hidden />
            </Link>
          ) : null}
          <Link href="/dashboard" prefetch className={BTN} aria-label="Dashboard" title="Dashboard">
            <LayoutGrid className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
