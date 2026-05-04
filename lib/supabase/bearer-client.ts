import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableEnv } from "@/lib/supabase/config";
import type { RunsheetDb } from "@/lib/supabase/db-client";
import type { Database } from "@/lib/database.types";

/** Supabase client that acts as the signed-in user from a JWT access token. */
export function createBearerClient(accessToken: string): RunsheetDb {
  const { url, anonKey } = getSupabasePublishableEnv();
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parseBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const t = authorization.slice(7).trim();
  return t.length > 0 ? t : null;
}
