export default function RunsheetLoading() {
  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-28 sm:p-2.5">
      <div className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-none border-0 bg-rs-surface shadow-none sm:rounded-[24px] sm:border sm:border-rs-border">
        <div className="aspect-[16/9] w-full animate-pulse bg-rs-muted-surface" />
        <div className="space-y-4 border-b border-rs-border px-4 py-5">
          <div className="h-3 w-14 animate-pulse rounded bg-rs-muted-surface" />
          <div className="h-6 w-48 animate-pulse rounded bg-rs-muted-surface" />
          <div className="h-4 w-64 animate-pulse rounded bg-rs-muted-surface" />
          <div className="flex gap-1 pt-1">
            <div className="h-9 w-24 animate-pulse rounded-[10px] bg-rs-muted-surface" />
            <div className="h-9 w-24 animate-pulse rounded-[10px] bg-rs-muted-surface" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-3 py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-12 shrink-0 animate-pulse rounded-[10px] bg-rs-muted-surface"
            />
          ))}
        </div>
        <div className="space-y-3 px-3 pb-16">
          <div className="h-20 animate-pulse rounded-[14px] bg-rs-muted-surface" />
          <div className="h-20 animate-pulse rounded-[14px] bg-rs-muted-surface" />
        </div>
      </div>
    </div>
  );
}
