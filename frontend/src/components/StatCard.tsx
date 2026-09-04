interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'green' | 'red' | 'amber' | 'gray';
  icon?: string;
  badge?: string;
  note?: string;
}

export default function StatCard({
  title,
  value,
  sub,
  accent = 'blue',
  icon,
  badge,
  note,
}: StatCardProps) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-card-header">
        <div className="card-title">{title}</div>
        {badge && <span className={`stat-badge badge-${accent}`}>{badge}</span>}
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
      {note && <div className="card-note">{note}</div>}
    </div>
  );
}
