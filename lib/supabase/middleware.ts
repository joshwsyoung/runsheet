import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { mergeSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabasePublishableEnv } from "@/lib/supabase/config";

/** Refresh only when the access token is within this of expiring. */
const REFRESH_WINDOW_MS = 60_000;
/** Never let a slow or sleeping Supabase hold a request open (that was the 504). */
const AUTH_TIMEOUT_MS = 3_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function updateSession(request: NextRequest) {
  let env: ReturnType<typeof getSupabasePublishableEnv>;
  try {
    env = getSupabasePublishableEnv();
  } catch {
    return NextResponse.next({ request });
  }
  const { url, anonKey: key } = env;

  let supabaseResponse = NextResponse.next({ request });

  // No auth cookie at all — nothing to refresh, so don't talk to Supabase.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasAuthCookie) return supabaseResponse;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, mergeSupabaseCookieOptions(options)),
        );
      },
    },
  });

  // getSession() reads the cookie locally. Only spend a network round trip when the
  // token is actually close to expiring — this previously ran on every single request,
  // including every RSC navigation, putting a Supabase RTT in front of every click.
  //
  // Safe to skip: middleware is not the security boundary here. Pages call
  // getSessionUser() and every table is behind RLS.
  const sessionResult = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS);
  const session = sessionResult?.data.session ?? null;

  const expiresInMs = session?.expires_at ? session.expires_at * 1000 - Date.now() : 0;
  if (session && expiresInMs > REFRESH_WINDOW_MS) {
    return supabaseResponse;
  }

  // Expiring, expired, or unreadable — refresh, but never hang the request on it.
  await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS);

  return supabaseResponse;
}
