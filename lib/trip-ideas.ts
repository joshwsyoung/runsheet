import type { Database } from "@/lib/database.types";

export type TripIdeaRow = Database["public"]["Tables"]["trip_ideas"]["Row"];

export const IDEA_CATEGORIES = [
  "breakfast",
  "restaurant",
  "bar",
  "beach",
  "activity",
  "other",
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

const CATEGORY_META: Record<IdeaCategory, { label: string; accent: string }> = {
  breakfast: { label: "Breakfast & coffee", accent: "#f1c40f" },
  restaurant: { label: "Restaurants", accent: "#e74c3c" },
  bar: { label: "Bars", accent: "#9b59b6" },
  beach: { label: "Beaches", accent: "#1abc9c" },
  activity: { label: "Activities", accent: "#2ecc71" },
  other: { label: "Other", accent: "#95a5a6" },
};

export function normalizeIdeaCategory(value: string | null | undefined): IdeaCategory {
  if (value && (IDEA_CATEGORIES as readonly string[]).includes(value)) {
    return value as IdeaCategory;
  }
  return "other";
}

export function ideaCategoryMeta(value: string | null | undefined) {
  return CATEGORY_META[normalizeIdeaCategory(value)];
}

/** Group ideas into category order, dropping empty categories. */
export function groupIdeasByCategory(
  ideas: TripIdeaRow[],
): { category: IdeaCategory; label: string; accent: string; items: TripIdeaRow[] }[] {
  return IDEA_CATEGORIES.map((category) => {
    const items = ideas.filter((i) => normalizeIdeaCategory(i.category) === category);
    const meta = CATEGORY_META[category];
    return { category, label: meta.label, accent: meta.accent, items };
  }).filter((g) => g.items.length > 0);
}

/** Which activity_type a scheduled idea should become. */
export function slotTypeForIdeaCategory(value: string | null | undefined): string {
  switch (normalizeIdeaCategory(value)) {
    case "breakfast":
      return "breakfast";
    case "restaurant":
      return "dinner";
    case "bar":
      return "activity";
    case "beach":
      return "activity";
    case "activity":
      return "activity";
    default:
      return "other";
  }
}

/** Sensible default wall-clock window when an idea is dropped onto a day. */
export function defaultWindowForIdeaCategory(
  value: string | null | undefined,
): { start: string; end: string } {
  switch (normalizeIdeaCategory(value)) {
    case "breakfast":
      return { start: "09:00", end: "10:30" };
    case "restaurant":
      return { start: "20:30", end: "22:30" };
    case "bar":
      return { start: "22:00", end: "23:30" };
    case "beach":
      return { start: "11:00", end: "18:00" };
    default:
      return { start: "11:00", end: "16:00" };
  }
}
