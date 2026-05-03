import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Runsheet",
  description: "Shared multi-day timelines for trips and events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
