import { useCallback, useEffect, useState } from 'react';
import { alertsApi } from '../api/client';
import type { Alert } from '../api/client';

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const loadAlerts = useCallback(async () => {
    const response = await alertsApi.active();

    if (response.ok) {
      setAlerts(response.data);
      setError(null);
    } else {
      setError(response.error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAlerts();

    const interval = window.setInterval(() => {
      void loadAlerts();
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

  const handleResolve = async (alertId: number) => {
    setResolvingId(alertId);
    try {
      const res = await alertsApi.resolve(alertId);
      if (res.ok) {
        // Optimistically remove or reload
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch {
      // Soft fail
    } finally {
      setResolvingId(null);
    }
  };

  const criticalCount = alerts.filter(
    (alert) => alert.severity === 'CRITICAL'
  ).length;

  const highCount = alerts.filter(
    (alert) => alert.severity === 'HIGH'
  ).length;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toLocaleTimeString();
  };

  return (
    <div className="alert-panel-card border-tactical">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-tag font-mono">IBVAP // LIVE INTELLIGENCE</span>
          <h3 className="panel-title">Active Threat Incidents</h3>
        </div>

        <div className="panel-badge-group">
          <span className={`badge ${error ? 'badge-amber' : 'badge-green'}`}>
            <span className={`dot ${error ? 'amber' : 'green'}`} />
            {error ? 'API RETRY' : 'REAL-TIME'}
          </span>

          <span className="count-pill font-mono">
            {alerts.length} ACTIVE
          </span>
        </div>
      </div>

      <div className="alert-panel-body">
        {loading ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">⏳</div>
            <h4 className="alert-empty-title">Loading incident telemetry</h4>
            <p className="alert-empty-text">Connecting to intelligence engine...</p>
          </div>
        ) : error ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">⚠</div>
            <h4 className="alert-empty-title">Threat telemetry unavailable</h4>
            <p className="alert-empty-text">{error}</p>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setLoading(true);
                void loadAlerts();
              }}
            >
              Retry
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">🛡</div>
            <h4 className="alert-empty-title">Perimeter Secure</h4>
            <p className="alert-empty-text">
              No active border breaches, zone violations, or unauthorized targets detected.
            </p>
          </div>
        ) : (
          <>
            <div className="alert-summary">
              <span className="font-mono text-crimson font-bold">
                {criticalCount} CRITICAL
              </span>
              <span className="font-mono text-orange font-bold">
                {highCount} HIGH
              </span>
              <span className="font-mono">
                {alerts.length} TOTAL ACTIVE
              </span>
            </div>

            <div className="alert-list">
              {alerts.slice(0, 7).map((alert) => {
                const isResolving = resolvingId === alert.id;
                const eventLabel = alert.event_type.replace(/_/g, ' ').toUpperCase();
                const confidencePct = alert.confidence != null ? `${Math.round(alert.confidence * 100)}%` : null;

                return (
                  <div
                    className={`alert-item alert-border-${alert.severity.toLowerCase()}`}
                    key={alert.id}
                  >
                    <div className="alert-item-main">
                      <div className="alert-item-header">
                        <span className="alert-event-name font-mono">
                          {eventLabel}
                        </span>

                        <span
                          className={`severity-badge severity-${alert.severity.toLowerCase()} font-mono`}
                        >
                          {alert.severity}
                        </span>
                      </div>

                      <div className="alert-item-meta font-mono">
                        <span>CAM: {alert.camera_id}</span>
                        {confidencePct && <span>CONF: {confidencePct}</span>}
                        <span>{formatTimestamp(alert.timestamp)}</span>
                      </div>

                      {alert.details && (
                        <div className="alert-item-details">
                          {alert.details}
                        </div>
                      )}
                    </div>

                    <div className="alert-item-actions">
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-danger"
                        onClick={() => handleResolve(alert.id)}
                        disabled={isResolving}
                        title="Mark alert as acknowledged and resolved"
                      >
                        {isResolving ? '...' : 'Acknowledge'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {alerts.length > 7 && (
              <div className="alert-list-footer font-mono">
                Showing latest 7 of {alerts.length} active alerts
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}