export const ACTIVITY_TYPES = [
  "hotel",
  "flight",
  "taxi",
  "boat",
  "driving",
  "rental_car",
  "hotel_checkin",
  "dinner",
  "lunch",
  "breakfast",
  "activity",
  "other",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

const TYPE_META: Record<
  ActivityType,
  { label: string; border: string; tint: string }
> = {
  hotel: { label: "Hotel", border: "#9b59b6", tint: "#faf8fc" },
  flight: { label: "Flight", border: "#3498db", tint: "#f5f9ff" },
  taxi: { label: "Taxi", border: "#f39c12", tint: "#fffbf5" },
  boat: { label: "Boat", border: "#1abc9c", tint: "#f5fffd" },
  driving: { label: "Driving", border: "#34495e", tint: "#f7f8f9" },
  rental_car: { label: "Rental car", border: "#e67e22", tint: "#fff9f4" },
  hotel_checkin: { label: "Check-in", border: "#9b59b6", tint: "#faf8fc" },
  dinner: { label: "Dinner", border: "#e74c3c", tint: "#fffafa" },
  lunch: { label: "Lunch", border: "#e67e22", tint: "#fffaf5" },
  breakfast: { label: "Breakfast", border: "#f1c40f", tint: "#fffef7" },
  activity: { label: "Activity", border: "#2ecc71", tint: "#fafffb" },
  other: { label: "Other", border: "#95a5a6", tint: "#fafafa" },
};

export function normalizeActivityType(value: string | null | undefined): ActivityType {
  if (value && (ACTIVITY_TYPES as readonly string[]).includes(value)) {
    return value as ActivityType;
  }
  return "other";
}

export function activityMeta(type: string | null | undefined) {
  const t = normalizeActivityType(type);
  return TYPE_META[t];
}
