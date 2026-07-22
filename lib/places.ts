/**
 * Place links.
 *
 * Deliberately a Google Maps *search* URL rather than a resolved place id: a lot of
 * these names came off a voice note and are uncertain, so a search that lands you on
 * a list of candidates is more honest than a pin that claims to be the right one.
 */
export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Turn-by-turn to a destination, from wherever the phone currently is. */
export function mapsDirectionsUrl(destination: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Prefer an explicit map_url on the row; otherwise build a search from the name. */
export function placeLink(
  mapUrl: string | null | undefined,
  placeName: string | null | undefined,
): string | null {
  if (mapUrl && mapUrl.trim()) return mapUrl.trim();
  if (placeName && placeName.trim()) return mapsSearchUrl(placeName.trim());
  return null;
}

/** A phone number we can hand to tel: — contact_info is free text, so be strict. */
export function telLink(contact: string | null | undefined): string | null {
  if (!contact) return null;
  const match = contact.match(/\+?[\d][\d\s().-]{6,}/);
  if (!match) return null;
  const digits = match[0].replace(/[^\d+]/g, "");
  return digits.length >= 7 ? `tel:${digits}` : null;
}
