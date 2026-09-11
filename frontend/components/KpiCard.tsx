import type { LucideIcon } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

export default function KpiCard({
  label,
  value,
  suffix = "",
  hint,
  icon: Icon,
  iconBg,
  iconFg,
  pulse = false,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  icon: LucideIcon;
  iconBg: string;
  iconFg: string;
  pulse?: boolean;
}) {
  return (
    <div className="kpi-card" style={{ borderLeft: `3px solid ${iconFg}` }}>
      <div className="kpi-icon" style={{ ["--icon-bg" as string]: iconBg, ["--icon-fg" as string]: iconFg }}>
        <Icon size={20} strokeWidth={2.25} className={pulse ? "flame-icon" : undefined} />
      </div>
      <div>
        <div className="kpi-value">
          <AnimatedNumber value={value} />
          {suffix}
        </div>
        <div className="kpi-label">{label}</div>
        {hint && <div className="kpi-hint">{hint}</div>}
      </div>
    </div>
  );
}
