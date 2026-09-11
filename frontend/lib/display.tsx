/** Small display helpers shared across pages -- icons/labels, not data logic. */
import {
  Armchair,
  Bus,
  Droplets,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  Trash2,
  Trees,
  Wifi,
  Zap,
  Building2,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
  "Network & Wi-Fi": Wifi,
  Electrical: Zap,
  Plumbing: Droplets,
  Structural: Building2,
  "Sanitation & Waste": Trash2,
  "Safety & Security": ShieldAlert,
  Transportation: Bus,
  "Grounds & Landscaping": Trees,
  "Furniture & Fixtures": Armchair,
  Other: HelpCircle,
};

export function categoryIconOf(category: string): LucideIcon {
  return CATEGORY_ICON[category] ?? Sparkles;
}

export function CategoryIcon({ category, size = 15 }: { category: string; size?: number }) {
  const Icon = categoryIconOf(category);
  return <Icon size={size} strokeWidth={2.25} style={{ flexShrink: 0 }} aria-hidden />;
}

export const STATUS_FLOW = ["new", "acknowledged", "in_progress", "resolved"] as const;

export const STATUS_LABEL: Record<string, string> = {
  new: "Received",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

/** Maps a priority score to one of the shared badge color classes (which
 * already have dark-mode variants) rather than hardcoded hex -- so priority
 * pills adapt to theme the same way status/severity badges do. */
export function priorityClass(score: number): string {
  if (score >= 80) return "priority-critical";
  if (score >= 55) return "priority-high";
  if (score >= 30) return "priority-medium";
  return "priority-low";
}
