"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createRunsheet, archiveRunsheet } from "@/app/actions/runsheets";

type RunsheetItem = {
  id: string;
  title: string;
  timezone: string;
  start_date: string;
  end_date: string;
};

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rs-btn rs-btn-primary w-full disabled:opacity-60">
      {pending ? "Creating…" : "Create runsheet"}
    </button>
  );
}

export function RunsheetListClient({
  runsheets,
  createErrorMessage,
  defaultStartUtc,
  defaultEndUtc,
}: {
  runsheets: RunsheetItem[];
  createErrorMessage: string | null;
  defaultStartUtc: string;
  defaultEndUtc: string;
}) {
  // A plain state-driven overlay rather than the native <dialog>: it renders reliably
  // across mobile browsers, and it can auto-open when the server bounced back with an
  // error so the message is actually visible instead of hidden in a closed dialog.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (createErrorMessage) setOpen(true);
  }, [createErrorMessage]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the modal.
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">Yours</p>
        <button
          type="button"
          className="rs-btn rs-btn-primary rs-btn-sm"
          onClick={() => setOpen(true)}
        >
          + Add
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="New runsheet"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-rs-border bg-rs-surface text-rs-text shadow-2xl sm:w-[min(92vw,430px)] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold">New runsheet</h2>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-rs-subtle hover:bg-rs-muted-surface"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <form action={createRunsheet} className="space-y-3">
                {createErrorMessage ? (
                  <p role="alert" className="rs-alert-danger text-sm">
                    {createErrorMessage}
                  </p>
                ) : null}
                <label className="block">
                  <span className="mb-1 block text-[0.62rem] font-bold uppercase text-rs-label">
                    Title
                  </span>
                  <input
                    name="title"
                    placeholder="e.g. Greece 2026"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
                    <span className="text-[0.62rem] font-bold uppercase text-rs-label">Trip starts</span>
                    <input
                      type="date"
                      name="start_date"
                      required
                      defaultValue={defaultStartUtc}
                      className="rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
                    <span className="text-[0.62rem] font-bold uppercase text-rs-label">Trip ends</span>
                    <input
                      type="date"
                      name="end_date"
                      required
                      defaultValue={defaultEndUtc}
                      className="rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums"
                    />
                  </label>
                </div>
                <input type="hidden" name="timezone" value="UTC" />
                <CreateButton />
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {runsheets.length === 0 ? (
          <p className="text-sm text-rs-muted">No runsheets yet.</p>
        ) : (
          runsheets.map((r) => (
            <div
              key={r.id}
              className="overflow-x-auto rounded-[14px] [scrollbar-width:none] [-ms-overflow-style:none] [touch-action:pan-y] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex min-w-[calc(100%+120px)] snap-x snap-mandatory">
                <Link
                  href={`/runsheet/${r.id}`}
                  className="flex w-full snap-start items-stretch overflow-hidden rounded-[14px] border border-rs-border bg-rs-surface no-underline shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
                >
                  <div className="w-1.5 shrink-0 bg-rs-primary" aria-hidden />
                  <div className="min-w-0 flex-1 p-3">
                    <p className="truncate text-[0.95rem] font-bold text-rs-text">{r.title}</p>
                    <p className="text-[0.72rem] text-rs-faint tabular-nums">{r.start_date} – {r.end_date}</p>
                    <span className="mt-1 inline-flex rounded-full bg-rs-today px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-rs-primary">{r.timezone}</span>
                  </div>
                </Link>
                <div className="flex w-[120px] snap-end items-stretch gap-1 pl-1">
                  <Link href={`/runsheet/${r.id}/settings`} className="rs-btn rs-btn-secondary h-full flex-1 rounded-[12px] text-xs no-underline">
                    Edit
                  </Link>
                  <form action={archiveRunsheet} className="flex-1">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="rs-btn rs-btn-danger h-full w-full rounded-[12px] text-xs">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
