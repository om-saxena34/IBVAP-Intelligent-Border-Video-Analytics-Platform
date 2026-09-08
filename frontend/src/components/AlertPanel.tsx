import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';

interface AlertPanelProps {
  onResolveSuccess?: (alertId: number) => void;
}

export default function AlertPanel({ onResolveSuccess }: AlertPanelProps) {
  const { alerts, activeAlerts, activeCount, loading, error, refresh, resolveAlert } =
    useAlerts(4000);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const criticalCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'CRITICAL').length,
    [activeAlerts]
  );

  const highCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'HIGH').length,
    [activeAlerts]
  );

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return ts;
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
    setResolvingId(id);
    try {
      const res = await resolveAlert(id);
      if (res.ok) {
        onResolveSuccess?.(id);
      }
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="alert-panel-card border-tactical">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-tag font-mono">IBVAP // LIVE INTELLIGENCE</span>
          <h3 className="panel-title">Active Threat Incidents</h3>
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
          <span className="count-pill font-mono">
            {loading && alerts.length === 0 ? '...' : `${activeCount} ACTIVE`}
          </span>
        </div>
      </div>

      <div className="alert-panel-body">
        {loading && alerts.length === 0 ? (
          <div className="alert-loading-state">
            <div className="loading-spinner" />
            <p>Querying threat intelligence feed...</p>
          </div>
        ) : error ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">⚠</div>
            <h4 className="alert-empty-title">Alert telemetry unavailable</h4>
            <p className="alert-empty-text">{error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void refresh()}
              style={{ marginTop: '0.75rem' }}
            >
              Retry
            </button>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">🛡</div>
            <h4 className="alert-empty-title">Perimeter Secure</h4>
            <p className="alert-empty-text">
              No active border breaches, zone violations, or unauthorized targets detected.
            </p>
            <div className="alert-api-notice" style={{ marginTop: '0.75rem' }}>
              <span className="notice-icon">✓</span>
              <span>
                Live alert telemetry is connected and monitoring active surveillance events.
              </span>
            </div>
            <NavLink to="/alerts" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
              View Alert Archive
            </NavLink>
          </div>
        ) : (
          <>
            <div className="alert-summary" style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
              <span className="badge badge-critical font-mono font-bold">{criticalCount} CRITICAL</span>
              <span className="badge badge-high font-mono font-bold">{highCount} HIGH</span>
              <span className="count-pill font-mono">{activeCount} TOTAL ACTIVE</span>
            </div>

            <div className="alerts-feed-list alert-list">
              {activeAlerts.slice(0, 7).map((alert) => {
                const isResolving = resolvingId === alert.id;
                const eventLabel = alert.event_type.replace(/_/g, ' ').toUpperCase();
                const confidencePct = alert.confidence != null ? `${Math.round(alert.confidence * 100)}%` : null;

                return (
                  <div
                    key={alert.id}
                    className={`alert-feed-item alert-item severity-${alert.severity.toLowerCase()} alert-border-${alert.severity.toLowerCase()}`}
                  >
                    <div className="alert-feed-left alert-item-main">
                      <div className="alert-item-header">
                        <span className={`severity-tag severity-badge ${getSeverityBadgeClass(alert.severity)} font-mono`}>
                          {alert.severity}
                        </span>
                        <span className="alert-feed-type alert-event-name font-mono">
                          {eventLabel}
                        </span>
                      </div>

                      <div className="alert-feed-sub alert-item-meta font-mono">
                        <span className="alert-cam-id">🎥 {alert.camera_id}</span>
                        <span className="alert-time">🕒 {formatTime(alert.timestamp)}</span>
                        {confidencePct && (
                          <span className="alert-confidence">
                            ⚡ {confidencePct} CONF
                          </span>
                        )}
                      </div>

                      {alert.details && (
                        <div className="alert-item-details">
                          {typeof alert.details === 'string'
                            ? alert.details
                            : JSON.stringify(alert.details)}
                        </div>
                      )}
                    </div>

                    <div className="alert-feed-actions alert-item-actions">
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm font-mono"
                        onClick={() => handleResolve(alert.id)}
                        disabled={isResolving}
                        title="Mark alert as resolved"
                      >
                        {isResolving ? '...' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {activeAlerts.length > 7 && (
                <div className="alerts-feed-footer font-mono">
                  <NavLink to="/alerts" className="view-all-link">
                    View all {activeAlerts.length} active alerts →
                  </NavLink>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}