export const DAY_STATUSES = ["travel", "work", "leave", "free"] as const;

export type DayStatus = (typeof DAY_STATUSES)[number];

const STATUS_META: Record<
  DayStatus,
  { label: string; short: string; dot: string; hint: string }
> = {
  travel: {
    label: "Travel day",
    short: "Travel",
    dot: "#d8543f",
    hint: "Getting there or getting home",
  },
  work: {
    label: "Working",
    short: "Work",
    dot: "#b8a98a",
    hint: "Keep the daytime light",
  },
  leave: {
    label: "On leave",
    short: "Leave",
    dot: "#2e6e8e",
    hint: "A whole day free",
  },
  free: {
    label: "Weekend",
    short: "Free",
    dot: "#5aa469",
    hint: "No work booked",
  },
};

export function normalizeDayStatus(value: string | null | undefined): DayStatus {
  if (value && (DAY_STATUSES as readonly string[]).includes(value)) {
    return value as DayStatus;
  }
  return "free";
}

export function dayStatusMeta(value: string | null | undefined) {
  return STATUS_META[normalizeDayStatus(value)];
}

/** Tap order for the status dot: work → leave → free → travel → work. */
export function nextDayStatus(value: string | null | undefined): DayStatus {
  const order: DayStatus[] = ["work", "leave", "free", "travel"];
  const i = order.indexOf(normalizeDayStatus(value));
  return order[(i + 1) % order.length]!;
}

/**
 * Working days are meant to stay sparse — Josh asked for the light days to be light
 * by design, not by accident. Anything past this on a work day gets a nudge in the UI.
 */
export const LIGHT_DAY_SLOT_BUDGET = 3;

export function isOverBudget(status: string | null | undefined, slotCount: number) {
  return normalizeDayStatus(status) === "work" && slotCount > LIGHT_DAY_SLOT_BUDGET;
}
