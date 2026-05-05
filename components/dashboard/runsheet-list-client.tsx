"use client";

import Link from "next/link";
import { useRef } from "react";
import { createRunsheet, archiveRunsheet } from "@/app/actions/runsheets";

type RunsheetItem = {
  id: string;
  title: string;
  timezone: string;
  start_date: string;
  end_date: string;
};

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
  const createModalRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">Yours</p>
        <button type="button" className="rs-btn rs-btn-primary rs-btn-sm" onClick={() => createModalRef.current?.showModal()}>
          + Add
        </button>
      </div>

      <dialog ref={createModalRef} className="w-[min(92vw,430px)] rounded-2xl border border-rs-border bg-rs-surface p-0 text-rs-text backdrop:bg-black/45">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">New runsheet</h2>
            <button type="button" className="rounded-lg px-2 py-1 text-rs-subtle hover:bg-rs-muted-surface" onClick={() => createModalRef.current?.close()}>
              ✕
            </button>
          </div>
          <form action={createRunsheet} className="space-y-3">
            {createErrorMessage ? <p role="alert" className="rs-alert-danger text-sm">{createErrorMessage}</p> : null}
            <input
              name="title"
              placeholder="Title (e.g. Greece 2026)"
              required
              className="w-full rounded-xl border border-rs-border px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
                <span className="text-[0.62rem] font-bold uppercase text-rs-label">Trip starts</span>
                <input type="date" name="start_date" required defaultValue={defaultStartUtc} className="rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums" />
              </label>
              <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
                <span className="text-[0.62rem] font-bold uppercase text-rs-label">Trip ends</span>
                <input type="date" name="end_date" required defaultValue={defaultEndUtc} className="rounded-xl border border-rs-border px-2 py-2 text-sm tabular-nums" />
              </label>
            </div>
            <input type="hidden" name="timezone" value="UTC" />
            <button type="submit" className="rs-btn rs-btn-primary w-full">
              Create
            </button>
          </form>
        </div>
      </dialog>

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
