import type { LucideIcon } from "lucide-react";

export default function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  iconBg,
  iconFg,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  iconBg: string;
  iconFg: string;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ ["--icon-bg" as string]: iconBg, ["--icon-fg" as string]: iconFg }}>
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {hint && <div className="kpi-hint">{hint}</div>}
      </div>
    </div>
  );
}
