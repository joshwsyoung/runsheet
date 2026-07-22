import type { Database } from "@/lib/database.types";
import { mapsDirectionsUrl, placeLink, telLink } from "@/lib/places";

type SlotRow = Database["public"]["Tables"]["slots"]["Row"];

export type SlotActionKind = "directions" | "ticket" | "link" | "call";

export type SlotAction = {
  kind: SlotActionKind;
  label: string;
  href: string;
  /** Leaves the app — open in a new tab and mark rel=noreferrer. */
  external: boolean;
};

export function attachmentUrlsOf(slot: SlotRow): string[] {
  return Array.isArray(slot.attachment_urls)
    ? slot.attachment_urls.filter((u): u is string => typeof u === "string" && Boolean(u))
    : [];
}

const TICKETED = new Set(["flight", "boat", "taxi", "rental_car", "hotel_checkin"]);

/**
 * The handful of things you'd actually want to tap on a card, in priority order.
 * Only ever returns actions that have somewhere real to go — no dead buttons.
 */
export function slotActions(slot: SlotRow): SlotAction[] {
  const out: SlotAction[] = [];

  const destination = slot.location_name?.trim() || slot.to_location?.trim() || "";
  if (destination) {
    out.push({
      kind: "directions",
      label: "Directions",
      href: mapsDirectionsUrl(destination),
      external: true,
    });
  } else {
    const map = placeLink(slot.map_url, null);
    if (map) out.push({ kind: "directions", label: "Map", href: map, external: true });
  }

  const attachments = attachmentUrlsOf(slot);
  if (attachments.length > 0) {
    out.push({ kind: "ticket", label: "Pass", href: attachments[0]!, external: true });
  } else if (slot.booking_ref && TICKETED.has(slot.activity_type)) {
    // No pass stored, but there is a reference worth opening the detail page for.
    out.push({ kind: "ticket", label: "Booking", href: "", external: false });
  }

  if (slot.link_url) {
    out.push({ kind: "link", label: "Link", href: slot.link_url, external: true });
  }

  const tel = telLink(slot.contact_info);
  if (tel) out.push({ kind: "call", label: "Call", href: tel, external: false });

  return out;
}
