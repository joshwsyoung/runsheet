export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#fcfcfc] font-sans text-[#333]">
      <div className="mx-auto max-w-3xl px-4 py-10 pb-20">{children}</div>
    </div>
  );
}
