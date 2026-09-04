interface PlaceholderViewProps {
  title: string;
  subtitle: string;
  icon: string;
  moduleKey: string;
  description: string;
  integrationNotes?: string[];
}

export default function PlaceholderView({
  title,
  subtitle,
  icon,
  moduleKey,
  description,
  integrationNotes = [],
}: PlaceholderViewProps) {
  return (
    <div className="placeholder-view">
      <div className="placeholder-header">
        <div className="placeholder-icon-wrap">{icon}</div>
        <div className="placeholder-title-group">
          <div className="placeholder-tags">
            <span className="module-key-tag">MODULE: {moduleKey.toUpperCase()}</span>
            <span className="dev-status-tag">MODULE UNDER DEVELOPMENT</span>
          </div>
          <h2 className="placeholder-title">{title}</h2>
          <p className="placeholder-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="placeholder-body">
        <div className="placeholder-card">
          <div className="card-flag">INTELLIGENCE SPECIFICATION</div>
          <h3 className="card-headline">System Development in Progress</h3>
          <p className="card-paragraph">{description}</p>

          <div className="development-notice-box">
            <span className="dev-icon">🛡</span>
            <div>
              <strong>SIH 2026 Architectural Compliance</strong>
              <p>
                In accordance with project integrity requirements, mock metrics, fake logs,
                and simulated counts are not displayed on this dashboard. This interface will
                populate automatically once corresponding FastAPI endpoints are published.
              </p>
            </div>
          </div>

          {integrationNotes.length > 0 && (
            <div className="integration-scope">
              <h4 className="scope-title">Planned Integration Pipeline:</h4>
              <ul className="scope-list">
                {integrationNotes.map((note, idx) => (
                  <li key={idx} className="scope-item">
                    <span className="scope-bullet">›</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
