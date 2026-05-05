import { ACTIVITY_TYPES } from "@/lib/activity-types";

export const metadata = {
  title: "Runsheet HTTP API",
  description: "REST API v1 for agents and integrations — auth, runsheets, days, slots, checklist, invites.",
};

const nav = [
  { href: "#auth", label: "Authentication" },
  { href: "#base", label: "Base URL" },
  { href: "#runsheets", label: "Runsheets" },
  { href: "#days", label: "Days" },
  { href: "#slots", label: "Slots" },
  { href: "#checklist", label: "Checklist" },
  { href: "#invites", label: "Invites" },
  { href: "#models", label: "Data models" },
  { href: "#openapi", label: "OpenAPI" },
];

export default function ApiDocsPage() {
  return (
    <article className="space-y-10 text-[0.95rem] leading-relaxed">
      <header className="space-y-2 border-b border-rs-border pb-6">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-rs-label">Runsheet</p>
        <h1 className="text-2xl font-bold text-rs-text">HTTP API v1</h1>
        <p className="text-rs-muted">
          Use these endpoints to list and edit trips programmatically. Row-level security in Supabase matches the
          web app: you only see runsheets you own or are a member of; only owners invite collaborators; editors can
          change slots and days.
        </p>
        <p className="text-sm text-rs-muted">
          Machine-readable spec:{" "}
          <code className="rounded bg-rs-code-bg px-1.5 py-0.5 text-[0.85rem] font-bold text-rs-text">
            GET /api/openapi
          </code>
        </p>
        <nav className="flex flex-wrap gap-2 pt-2">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-full border border-rs-border bg-rs-surface px-3 py-1 text-xs font-bold text-rs-secondary no-underline hover:border-rs-primary hover:text-rs-primary"
            >
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <section id="auth" className="scroll-mt-8 space-y-3">
        <h2 className="text-lg font-bold text-rs-text">Authentication</h2>
        <p>
          Every request (except this documentation page) must send the Supabase user JWT in the{" "}
          <code className="rounded bg-rs-code-bg px-1.5 py-0.5 text-[0.85rem]">Authorization</code> header:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-rs-border bg-rs-surface p-4 text-[0.8rem]">
          {`Authorization: Bearer <access_token>`}
        </pre>
        <p className="text-rs-muted">
          Obtain <code className="rounded bg-rs-code-bg px-1">access_token</code> from password sign-in (Supabase
          Auth) or from the hosted session after OAuth. Refresh the token before it expires. There is no separate API
          key: the same anon key + user JWT model as the web app applies.
        </p>
      </section>

      <section id="base" className="scroll-mt-8 space-y-3">
        <h2 className="text-lg font-bold text-rs-text">Base URL</h2>
        <p>
          All v1 routes are under <code className="rounded bg-rs-code-bg px-1.5">/api/v1</code> on your deployment
          origin, e.g. <code className="rounded bg-rs-code-bg px-1.5">https://your-app.vercel.app/api/v1/...</code>
        </p>
      </section>

      <section id="runsheets" className="scroll-mt-8 space-y-3">
        <h2 className="text-lg font-bold text-rs-text">Runsheets</h2>
        <ul className="list-inside list-disc space-y-2 text-rs-secondary">
          <li>
            <code className="font-mono text-[0.85rem]">GET /api/v1/me</code> — current user id and email.
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">GET /api/v1/runsheets</code> — list non-archived runsheets you
            can access.
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">POST /api/v1/runsheets</code> — body{" "}
            <code className="rounded bg-rs-code-bg px-1">
              {"{ \"title\": string, \"start_date\": \"YYYY-MM-DD\", \"end_date\": \"YYYY-MM-DD\", \"timezone\"?: string }"}
            </code>
            {" "}
            (<code className="rounded bg-rs-code-bg px-1">end_date</code> must be on or after{" "}
            <code className="rounded bg-rs-code-bg px-1">start_date</code>; timezone defaults to{" "}
            <code className="rounded bg-rs-code-bg px-1">UTC</code>). Returns{" "}
            <code className="rounded bg-rs-code-bg px-1">{"{ id, title, timezone, start_date, end_date }"}</code>.
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">GET /api/v1/runsheets/{"{runsheetId}"}</code> — one runsheet row:{" "}
            <code className="rounded bg-rs-code-bg px-1">
              id, title, owner_id, timezone, start_date, end_date, created_at, archived_at
            </code>
            .
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">PATCH /api/v1/runsheets/{"{runsheetId}"}</code> — body optional{" "}
            <code className="rounded bg-rs-code-bg px-1">title</code>, <code className="rounded bg-rs-code-bg px-1">timezone</code>
            , and <code className="rounded bg-rs-code-bg px-1">start_date</code>/<code className="rounded bg-rs-code-bg px-1">end_date</code>
            {" "}
            (both trip dates together if updating bounds).
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">DELETE /api/v1/runsheets/{"{runsheetId}"}</code> — soft-archive
            (sets <code className="rounded bg-rs-code-bg px-1">archived_at</code>).
          </li>
        </ul>
      </section>

      <section id="days" className="scroll-mt-8 space-y-3">
        <h2 className="text-lg font-bold text-rs-text">Calendar days</h2>
        <ul className="list-inside list-disc space-y-2 text-rs-secondary">
          <li>
            <code className="font-mono text-[0.85rem]">GET /api/v1/runsheets/{"{id}"}/days</code> — optional query{" "}
            <code className="rounded bg-rs-code-bg px-1">from</code>, <code className="rounded bg-rs-code-bg px-1">to</code>{" "}
            (<code className="rounded bg-rs-code-bg px-1">YYYY-MM-DD</code>) to filter. Returns{" "}
            <code className="rounded bg-rs-code-bg px-1">days[]</code> with{" "}
            <code className="rounded bg-rs-code-bg px-1">id, runsheet_id, day_date, label, is_special</code>.
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">POST /api/v1/runsheets/{"{id}"}/days</code> — body{" "}
            <code className="rounded bg-rs-code-bg px-1">{"{ \"dates\": [\"2026-05-21\", ...] }"}</code>. Upserts rows so
            slots can target those dates.
          </li>
        </ul>
      </section>

      <section id="slots" className="scroll-mt-8 space-y-3">
        <h2 className="text-lg font-bold text-rs-text">Slots (itinerary blocks)</h2>
        <p className="text-rs-muted">
          Times are always sent as <strong>wall clock</strong> strings <code className="rounded bg-rs-code-bg px-1">HH:mm</code>{" "}
          in the runsheet&apos;s IANA <code className="rounded bg-rs-code-bg px-1">timezone</code>; the API converts to
          UTC for storage.
        </p>
        <ul className="list-inside list-disc space-y-2 text-rs-secondary">
          <li>
            <code className="font-mono text-[0.85rem]">GET /api/v1/runsheets/{"{id}"}/slots?day=YYYY-MM-DD</code> — all
            slots for that calendar day (requires an existing day row).
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">POST /api/v1/runsheets/{"{id}"}/slots</code> — body uses camelCase
            or snake_case aliases:
            <pre className="mt-2 overflow-x-auto rounded-xl border border-rs-border bg-rs-surface p-4 text-[0.78rem]">
              {`{
  "dayYmd": "2026-05-21",
  "startHm": "09:00",
  "endHm": "10:30",
  "title": "Flight to Athens",
  "activityType": "flight",
  "description": "optional plain text",
  "descriptionBullets": ["line one", "line two"],
  "linkUrl": "https://...",
  "bookingRef": "ABC123",
  "contactInfo": "+44 ...",
  "openEnd": false
}`}
            </pre>
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">GET|PATCH|DELETE .../slots/{"{slotId}"}</code> — single slot;
            PATCH accepts the same fields as POST; <code className="rounded bg-rs-code-bg px-1">dayYmd</code> defaults to
            the slot&apos;s current day if omitted.
          </li>
        </ul>
        <p className="text-[0.85rem] text-rs-muted">
          <strong>activityType</strong> must be one of: {ACTIVITY_TYPES.join(", ")}.
        </p>
        <p className="text-[0.85rem] text-rs-muted">
          Link preview enrichment (Open Graph fetch) stays on{" "}
          <code className="rounded bg-rs-code-bg px-1">POST /api/slots/{"{slotId}"}/preview</code> (cookie session as in
          the UI).
        </p>
      </section>

      <section id="checklist" className="scroll-mt-8 space-y-3">
        <h2 className="text-lg font-bold text-rs-text">Checklist</h2>
        <ul className="list-inside list-disc space-y-2 text-rs-secondary">
          <li>
            <code className="font-mono text-[0.85rem]">GET .../checklist?day=YYYY-MM-DD</code> — items for that day.
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">POST .../checklist</code> — body{" "}
            <code className="rounded bg-rs-code-bg px-1">{"{ \"dayYmd\", \"label\" }"}</code> (or <code className="rounded bg-rs-code-bg px-1">day</code>).
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">PATCH .../checklist/{"{itemId}"}</code> —{" "}
            <code className="rounded bg-rs-code-bg px-1">{"{ \"done\": true }"}</code> and/or{" "}
            <code className="rounded bg-rs-code-bg px-1">label</code>.
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">DELETE .../checklist/{"{itemId}"}</code>.
          </li>
        </ul>
      </section>

      <section id="invites" className="scroll-mt-8 space-y-3">
        <h2 className="text-lg font-bold text-rs-text">Invites (owner only)</h2>
        <ul className="list-inside list-disc space-y-2 text-rs-secondary">
          <li>
            <code className="font-mono text-[0.85rem]">GET /api/v1/runsheets/{"{id}"}/invites</code> — pending invites.
          </li>
          <li>
            <code className="font-mono text-[0.85rem]">POST .../invites</code> —{" "}
            <code className="rounded bg-rs-code-bg px-1">{"{ \"email\": \"a@b.com\", \"role\": \"editor\" | \"viewer\" }"}</code>.
            Response includes <code className="rounded bg-rs-code-bg px-1">token</code> for building{" "}
            <code className="rounded bg-rs-code-bg px-1">/invite/{"{token}"}</code> links.
          </li>
        </ul>
        <p className="text-[0.85rem] text-rs-muted">
          Accepting an invite uses the existing RPC <code className="rounded bg-rs-code-bg px-1">accept_runsheet_invite</code>{" "}
          from the web flow, not HTTP v1.
        </p>
      </section>

      <section id="models" className="scroll-mt-8 space-y-4">
        <h2 className="text-lg font-bold text-rs-text">Database fields (public tables)</h2>
        <p className="text-rs-muted">
          The API returns rows shaped like your Supabase project. Primary shapes:
        </p>
        <div className="space-y-4 text-[0.88rem]">
          <div>
            <h3 className="font-bold text-rs-text">runsheets</h3>
            <p className="text-rs-muted">
              id, title, owner_id → auth.users, timezone (IANA), start_date/end_date inclusive trip bounds (calendar
              dates), created_at, archived_at (null = active).
            </p>
          </div>
          <div>
            <h3 className="font-bold text-rs-text">runsheet_days</h3>
            <p className="text-rs-muted">
              id, runsheet_id, day_date (date), label (optional subtitle), is_special.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-rs-text">slots</h3>
            <p className="text-rs-muted">
              id, day_id, start_at, end_at (timestamptz), activity_type, title, description, description_bullets, todos
              (jsonb array), link_url, booking_ref, contact_info, open_ended, preview_* link cache fields, sort_order,
              timestamps.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-rs-text">checklist_items</h3>
            <p className="text-rs-muted">id, day_id, label, done, sort_order.</p>
          </div>
          <div>
            <h3 className="font-bold text-rs-text">runsheet_invites</h3>
            <p className="text-rs-muted">
              id, runsheet_id, email, role, token, invited_by, created_at, accepted_at.
            </p>
          </div>
        </div>
      </section>

      <section id="openapi" className="scroll-mt-8 space-y-3 border-t border-rs-border pt-8">
        <h2 className="text-lg font-bold text-rs-text">OpenAPI</h2>
        <p>
          Request <code className="rounded bg-rs-code-bg px-1.5 text-[0.85rem]">/api/openapi</code> from the same origin
          to import into Postman, Insomnia, or codegen tools. The document is a concise overview; detailed semantics match
          this page and Supabase RLS.
        </p>
      </section>
    </article>
  );
}
