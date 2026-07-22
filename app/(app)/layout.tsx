import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/cached-session";
import { AppHeader } from "@/components/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
