export default function StatTile({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  accent?: string;
}) {
  return (
    <div className="stat-tile" style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}>
      {icon && <div className="stat-tile-icon">{icon}</div>}
      <div className="stat-tile-value">{value}</div>
      <div className="stat-tile-label">{label}</div>
      {hint && <div className="stat-tile-hint">{hint}</div>}
    </div>
  );
}
