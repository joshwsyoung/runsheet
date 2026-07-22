export default function AppLoading() {
  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-0 pb-16 sm:p-2.5">
      <div className="flex w-full max-w-[450px] flex-col gap-3 overflow-hidden rounded-none border-0 sm:rounded-[24px] sm:border sm:border-rs-border sm:p-5">
        <div className="h-7 w-40 animate-pulse rounded-md bg-rs-muted-surface" />
        <div className="h-24 animate-pulse rounded-[14px] bg-rs-muted-surface" />
        <div className="h-36 animate-pulse rounded-[14px] bg-rs-muted-surface" />
        <div className="h-28 animate-pulse rounded-[14px] bg-rs-muted-surface" />
      </div>
    </div>
  );
}
