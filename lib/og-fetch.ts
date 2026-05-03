import net from "node:net";

const MAX_BYTES = 512_000;
const TIMEOUT_MS = 8_000;

function isPrivateHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".local")) return true;
  if (net.isIP(hostname)) {
    if (hostname.startsWith("10.")) return true;
    if (hostname.startsWith("127.")) return true;
    if (hostname.startsWith("169.254.")) return true;
    if (hostname.startsWith("192.168.")) return true;
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts[0] === 172 && parts[1]! >= 16 && parts[1]! <= 31) {
      return true;
    }
    if (hostname === "::1") return true;
  }
  return false;
}

export type OgPreview = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
};

function pickMeta(html: string, property: string): string | null {
  const og = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  ).exec(html);
  if (og?.[1]) return decodeHtml(og[1]);
  const og2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    "i",
  ).exec(html);
  if (og2?.[1]) return decodeHtml(og2[1]);
  return null;
}

function pickNameMeta(html: string, name: string): string | null {
  const m = new RegExp(
    `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i",
  ).exec(html);
  if (m?.[1]) return decodeHtml(m[1]);
  const m2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`,
    "i",
  ).exec(html);
  if (m2?.[1]) return decodeHtml(m2[1]);
  return null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function pickTitle(html: string): string | null {
  const t = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return t?.[1] ? decodeHtml(t[1].trim()) : null;
}

function absolutize(url: string | null, base: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

export async function fetchOgPreview(rawUrl: string): Promise<OgPreview> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return { title: null, description: null, imageUrl: null };
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return { title: null, description: null, imageUrl: null };
  }
  if (isPrivateHostname(target.hostname)) {
    return { title: null, description: null, imageUrl: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target.href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "RunsheetLinkPreview/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return { title: null, description: null, imageUrl: null };
    }
    const reader = res.body?.getReader();
    if (!reader) {
      return { title: null, description: null, imageUrl: null };
    }
    const decoder = new TextDecoder();
    let received = 0;
    let html = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        reader.cancel();
        break;
      }
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>") || html.length > MAX_BYTES) break;
    }
    const title =
      pickMeta(html, "og:title") ??
      pickNameMeta(html, "twitter:title") ??
      pickTitle(html);
    const description =
      pickMeta(html, "og:description") ??
      pickNameMeta(html, "twitter:description") ??
      pickNameMeta(html, "description");
    const imageRaw =
      pickMeta(html, "og:image") ?? pickNameMeta(html, "twitter:image");
    const imageUrl = absolutize(imageRaw, target.href);
    return { title, description, imageUrl };
  } catch {
    return { title: null, description: null, imageUrl: null };
  } finally {
    clearTimeout(timer);
  }
}
