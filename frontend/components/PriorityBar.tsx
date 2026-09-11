import type { PriorityBreakdown } from "@/lib/api";

const SEGMENTS: { key: keyof Omit<PriorityBreakdown, "total">; label: string; color: string }[] = [
  { key: "severity_base", label: "Severity", color: "#6366f1" },
  { key: "cluster_bonus", label: "Frequency (cluster)", color: "#ef4444" },
  { key: "category_weight", label: "Category risk", color: "#f59e0b" },
  { key: "persistence_bonus", label: "Persistence", color: "#06b6d4" },
];

/** Explainable-AI touch: shows *why* a report has this priority score,
 * broken into the same terms app/ai/priority.py computes it from. */
export default function PriorityBar({ breakdown }: { breakdown: PriorityBreakdown }) {
  const max = 100;
  return (
    <div>
      <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--bg-soft)" }}>
        {SEGMENTS.map((seg) => {
          const value = breakdown[seg.key] ?? 0;
          const pct = (value / max) * 100;
          return pct > 0 ? (
            <div key={seg.key} style={{ width: `${pct}%`, background: seg.color }} title={`${seg.label}: +${value}`} />
          ) : null;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", marginTop: "0.55rem" }}>
        {SEGMENTS.map((seg) => (
          <div key={seg.key} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.76rem", color: "var(--text-soft)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, display: "inline-block" }} />
            {seg.label} <strong style={{ color: "var(--text)" }}>+{breakdown[seg.key]}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
