import {
  Baby,
  BadgePercent,
  Bike,
  BriefcaseBusiness,
  CalendarCheck2,
  Gift,
  HeartHandshake,
  House,
  Leaf,
  Map,
  PawPrint,
  Plane,
  Sparkles,
} from "lucide-react";
import type { ThemeKey } from "@/lib/types";

const iconMap = {
  short: Bike,
  month: House,
  workation: BriefcaseBusiness,
  local: Map,
  returnFarm: Leaf,
  event: CalendarCheck2,
  pet: PawPrint,
  half: BadgePercent,
  daily: Gift,
  family: Baby,
  easy: Plane,
  benefit: HeartHandshake,
  exclusive: Sparkles,
} satisfies Record<ThemeKey, typeof Bike>;

export function ThemeIcon({ theme, size = 22 }: { theme: ThemeKey; size?: number }) {
  const Icon = iconMap[theme];
  return <Icon size={size} strokeWidth={2.2} />;
}
