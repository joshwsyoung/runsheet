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

/** Prefer an explicit map_url on the row; otherwise build a search from the name. */
export function placeLink(
  mapUrl: string | null | undefined,
  placeName: string | null | undefined,
): string | null {
  if (mapUrl && mapUrl.trim()) return mapUrl.trim();
  if (placeName && placeName.trim()) return mapsSearchUrl(placeName.trim());
  return null;
}
