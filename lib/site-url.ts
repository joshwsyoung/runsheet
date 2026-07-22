import { headers } from "next/headers";

/** Strip accidental whitespace (common in Vercel env UI) so Supabase redirect_to matches allow list. */
function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, "");
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof raw === "string" && raw.trim() !== "") {
    return normalizeOrigin(raw);
  }
  return "http://localhost:3000";
}

/** True for localhost / loopback hosts (HTTP in dev unless proxy says HTTPS). */
function isLocalLoopback(host: string): boolean {
  if (/^localhost(:\d+)?$/i.test(host)) return true;
  if (/^127\.0\.0\.1(:\d+)?$/.test(host)) return true;
  return false;
}

function inferProto(host: string, forwardedProtoHeader: string | null): "http" | "https" {
  const forwarded = forwardedProtoHeader?.split(",")[0]?.trim().toLowerCase();
  if (forwarded === "http" || forwarded === "https") return forwarded;
  return isLocalLoopback(host) ? "http" : "https";
}

/**
 * Origin for Supabase redirect URLs (signup confirm, password reset).
 * Prefers the request Host so localhost:PORT matches the browser (avoids .env port drift).
 */
export async function getAuthSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") ?? h.get("host"))?.trim();
    if (host) {
      const proto = inferProto(host, h.get("x-forwarded-proto"));
      return normalizeOrigin(`${proto}://${host}`);
    }
  } catch {
    /* headers unavailable outside request */
  }
  return getSiteUrl();
}
