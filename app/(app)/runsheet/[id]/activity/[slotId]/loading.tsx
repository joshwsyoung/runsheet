export default function ActivityLoading() {
  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 sm:p-2.5">
      <div className="flex w-full max-w-[450px] flex-col gap-4 rounded-none border-0 bg-rs-surface px-4 py-5 sm:rounded-[24px] sm:border sm:border-rs-border sm:p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-rs-muted-surface" />
        <div className="h-8 max-w-[20rem] w-full animate-pulse rounded bg-rs-muted-surface" />
        <div className="h-40 animate-pulse rounded-[14px] bg-rs-muted-surface" />
        <div className="h-12 animate-pulse rounded-xl bg-rs-muted-surface" />
      </div>
    </div>
  );
}
