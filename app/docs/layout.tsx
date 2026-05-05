export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-rs-page font-sans text-rs-text">
      <div className="mx-auto max-w-3xl px-4 py-10 pb-20">{children}</div>
    </div>
  );
}
