import {
  Bed,
  Plane,
  Car,
  Ship,
  Navigation,
  KeyRound,
  UtensilsCrossed,
  Sandwich,
  Croissant,
  Waves,
  CircleDot,
  type LucideIcon,
} from "lucide-react";
import { normalizeActivityType } from "@/lib/activity-types";

const ICONS: Record<string, LucideIcon> = {
  hotel: Bed,
  flight: Plane,
  taxi: Car,
  boat: Ship,
  driving: Navigation,
  rental_car: Car,
  hotel_checkin: KeyRound,
  dinner: UtensilsCrossed,
  lunch: Sandwich,
  breakfast: Croissant,
  activity: Waves,
  other: CircleDot,
};

export function ActivityIcon({
  type,
  className = "h-3.5 w-3.5",
  color,
}: {
  type: string | null | undefined;
  className?: string;
  color?: string;
}) {
  const Icon = ICONS[normalizeActivityType(type)] ?? CircleDot;
  return <Icon className={className} style={color ? { color } : undefined} aria-hidden />;
}
