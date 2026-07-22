import { NextResponse } from "next/server";

/**
 * Diagnostic: is a Google Maps key present in this build, and does Google accept it?
 *
 * Never returns the key or any part of it. The probe is a server-side request to the
 * Embed endpoint, which has an important caveat: a key correctly restricted by HTTP
 * referrer is *expected* to be rejected here, because a server request carries no
 * browser Referer. So a referrer rejection is a pass, not a failure — it only tells us
 * the key exists and the API is enabled.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({
      configured: false,
      hint: "GOOGLE_MAPS_API_KEY was not present when this deployment was built. Add it in Vercel and redeploy — it is read at build time.",
    });
  }

  let probe: Record<string, unknown> = { ran: false };
  try {
    const res = await fetch(
      `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=Paros`,
      { cache: "no-store" },
    );
    const body = (await res.text()).slice(0, 4000);
    const lower = body.toLowerCase();

    let verdict = "unknown";
    if (res.ok && !lower.includes("error")) verdict = "accepted";
    else if (lower.includes("referernotallowed") || lower.includes("referer"))
      verdict = "referrer_restricted_expected_from_server";
    else if (lower.includes("apinotactivated") || lower.includes("not authorized"))
      verdict = "maps_embed_api_not_enabled";
    else if (lower.includes("invalidkey") || lower.includes("api key")) verdict = "key_rejected";

    probe = { ran: true, httpStatus: res.status, verdict };
  } catch (e) {
    probe = { ran: false, error: e instanceof Error ? e.name : "fetch_failed" };
  }

  return NextResponse.json({ configured: true, keyLength: key.length, probe });
}
