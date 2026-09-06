import { useCallback, useEffect, useState } from 'react';
import { alertsApi } from '../api/client';
import type { Alert } from '../api/client';

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

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

    return date.toLocaleString();
  };

  return (
    <div className="alert-panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <span className="panel-tag">INTELLIGENCE FEED</span>
          <h3 className="panel-title">Recent Border Alerts</h3>
        </div>

        <div className="panel-badge-group">
          <span
            className={`badge ${
              error ? 'badge-amber' : 'badge-green'
            }`}
          >
            <span
              className={`dot ${
                error ? 'amber' : 'green'
              }`}
            />
            {error ? 'API ERROR' : 'LIVE'}
          </span>

          <span className="count-pill">
            {alerts.length} ACTIVE
          </span>
        </div>
      </div>

      <div className="alert-panel-body">
        {loading ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">⏳</div>
            <h4 className="alert-empty-title">
              Loading alert telemetry
            </h4>
            <p className="alert-empty-text">
              Connecting to the live threat detection pipeline...
            </p>
          </div>
        ) : error ? (
          <div className="alert-empty-state">
            <div className="alert-empty-icon">⚠</div>
            <h4 className="alert-empty-title">
              Alert telemetry unavailable
            </h4>
            <p className="alert-empty-text">
              {error}
            </p>

            <button
              type="button"
              className="btn btn-sm"
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
            <h4 className="alert-empty-title">
              No active alerts
            </h4>
            <p className="alert-empty-text">
              No active border threats have been detected.
            </p>

            <div className="alert-api-notice">
              <span className="notice-icon">✓</span>
              <span>
                Live alert telemetry is connected and monitoring
                active surveillance events.
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="alert-summary">
              <span>
                {criticalCount} CRITICAL
              </span>

              <span>
                {highCount} HIGH
              </span>

              <span>
                {alerts.length} TOTAL ACTIVE
              </span>
            </div>

            <div className="alert-list">
              {alerts.slice(0, 6).map((alert) => (
                <div
                  className="alert-item"
                  key={alert.id}
                >
                  <div className="alert-item-main">
                    <div className="alert-item-header">
                      <strong>
                        {alert.event_type}
                      </strong>

                      <span
                        className={`severity-badge severity-${alert.severity.toLowerCase()}`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <div className="alert-item-meta">
                      <span>
                        Camera: {alert.camera_id}
                      </span>

                      <span>
                        {formatTimestamp(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {alerts.length > 6 && (
              <div className="alert-list-footer">
                Showing latest 6 of {alerts.length} active alerts
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}