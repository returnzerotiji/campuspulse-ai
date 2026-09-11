/** Small display helpers shared across pages -- icons/labels, not data logic. */

export const CATEGORY_ICON: Record<string, string> = {
  "Network & Wi-Fi": "📶",
  Electrical: "⚡",
  Plumbing: "🚰",
  Structural: "🏗️",
  "Sanitation & Waste": "🧹",
  "Safety & Security": "🛡️",
  Transportation: "🚌",
  "Grounds & Landscaping": "🌳",
  "Furniture & Fixtures": "🪑",
  Other: "❓",
};

export function categoryIcon(category: string): string {
  return CATEGORY_ICON[category] ?? "📌";
}

export const SEVERITY_ICON: Record<string, string> = {
  low: "🟢",
  medium: "🟡",
  high: "🟠",
  critical: "🔴",
};

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
