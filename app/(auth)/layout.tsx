export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-rs-page p-4 pb-10">
      <div className="w-full max-w-[400px] pt-10">{children}</div>
    </div>
  );
}
