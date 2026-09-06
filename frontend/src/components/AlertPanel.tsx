import { useAlerts } from '../hooks/useAlerts';
import { NavLink } from 'react-router-dom';


interface AlertPanelProps {
  onResolveSuccess?: (alertId: number) => void;
}

export default function AlertPanel({ onResolveSuccess }: AlertPanelProps) {
  const { alerts, activeAlerts, activeCount, loading, error, resolveAlert } = useAlerts(4000);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
        return 'badge-low';
      default:
        return 'badge-high';
    }
  };

  const handleResolve = async (id: number) => {
    const res = await resolveAlert(id);
    if (res.ok) {
      onResolveSuccess?.(id);
    }
  };

  return (
    <div className="alert-panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-tag">INTELLIGENCE FEED</span>
          <h3 className="panel-title">Recent Border Alerts</h3>
        </div>
        <div className="panel-badge-group">
          {error ? (
            <span className="badge badge-error">
              <span className="dot error" />
              API Error
            </span>
          ) : (
            <span className={`badge ${activeCount > 0 ? 'badge-amber' : 'badge-green'}`}>
              <span className={`dot ${activeCount > 0 ? 'amber' : 'green'}`} />
              {activeCount > 0 ? 'Threats Detected' : 'Perimeter Secure'}
            </span>
          )}
          <span className="count-pill">
            ACTIVE ALERTS: {loading && alerts.length === 0 ? '...' : activeCount}
          </span>
        </div>
      </div>

      <div className="alert-panel-body">
        {loading && alerts.length === 0 ? (
          <div className="alert-loading-state">
            <div className="loading-spinner" />
            <p>Querying threat intelligence feed...</p>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">🛡</div>
            <h4 className="alert-empty-title">No Active Threat Alerts</h4>
            <p className="alert-empty-text">
              Perimeter sensors are nominal. High/Critical virtual fence breaches or suspicious activity will trigger live alerts here.
            </p>
            <NavLink to="/alerts" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
              View Alert Archive
            </NavLink>
          </div>
        ) : (
          <div className="alerts-feed-list">
            {activeAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`alert-feed-item severity-${alert.severity.toLowerCase()}`}>
                <div className="alert-feed-left">
                  <span className={`severity-tag ${getSeverityBadgeClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div className="alert-feed-meta">
                    <h4 className="alert-feed-type">
                      {alert.event_type.replace(/_/g, ' ')}
                    </h4>
                    <div className="alert-feed-sub">
                      <span className="alert-cam-id font-mono">🎥 {alert.camera_id}</span>
                      <span className="alert-time font-mono">🕒 {formatTime(alert.timestamp)}</span>
                      {alert.confidence && (
                        <span className="alert-confidence font-mono">
                          ⚡ {(alert.confidence * 100).toFixed(0)}% CONF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="alert-feed-actions">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm font-mono"
                    onClick={() => handleResolve(alert.id)}
                    title="Mark alert as resolved"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
            {activeAlerts.length > 5 && (
              <div className="alerts-feed-footer">
                <NavLink to="/alerts" className="view-all-link">
                  View all {activeAlerts.length} active alerts →
                </NavLink>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
