"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

/**
 * A ready-to-send invite link.
 *
 * The app does not send invite emails itself, so sharing works by the owner passing
 * this link to the person however they like (text, WhatsApp, email). The person must
 * sign in with the exact address the invite was for, so that is spelled out here.
 *
 * Uses the Web Share sheet on devices that have one (phones), falling back to
 * copy-to-clipboard everywhere else.
 */
export function InviteShareLink({
  url,
  email,
  tripTitle,
}: {
  url: string;
  email: string;
  tripTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    return () => window.clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(el);
      }
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    try {
      await navigator.share({
        title: `${tripTitle} — trip invite`,
        text: `Join my "${tripTitle}" trip plan. Sign in with ${email} to accept:`,
        url,
      });
    } catch {
      /* user dismissed the share sheet, or it is unavailable — no-op */
    }
  }

  return (
    <div className="rounded-xl border border-rs-border bg-rs-muted-surface/50 p-2.5">
      <p className="mb-1.5 break-all font-mono text-[0.72rem] text-rs-secondary">{url}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rs-primary px-3 py-1.5 text-[0.72rem] font-bold text-white"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden /> Copy link
            </>
          )}
        </button>
        {canShare ? (
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rs-border bg-rs-surface px-3 py-1.5 text-[0.72rem] font-bold text-rs-secondary"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden /> Share
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-[0.68rem] leading-snug text-rs-muted">
        Send this to them. They must sign in (or sign up) with{" "}
        <span className="font-bold text-rs-secondary">{email}</span> to accept.
      </p>
    </div>
  );
}
