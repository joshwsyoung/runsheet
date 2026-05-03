import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getSupabasePublishableEnv } from "@/lib/supabase/config";

export function createClient() {
  const { url, anonKey } = getSupabasePublishableEnv();
  return createBrowserClient<Database>(url, anonKey);
}
