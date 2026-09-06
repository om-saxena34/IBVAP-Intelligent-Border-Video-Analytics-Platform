import { useState, useMemo } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { intelligenceApi } from '../api/intelligenceApi';
import type { Severity, AlertStatus } from '../api/alertsApi';

export default function AlertsPage() {
  const { alerts, resolvedAlerts, activeCount, loading, error, refresh, resolveAlert } =
    useAlerts(3500);


  const [statusFilter, setStatusFilter] = useState<'ALL' | AlertStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [cameraSearch, setCameraSearch] = useState<string>('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (statusFilter !== 'ALL' && alert.status !== statusFilter) return false;
      if (severityFilter !== 'ALL' && alert.severity !== severityFilter) return false;
      if (
        cameraSearch &&
        !alert.camera_id.toLowerCase().includes(cameraSearch.toLowerCase()) &&
        !alert.event_type.toLowerCase().includes(cameraSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [alerts, statusFilter, severityFilter, cameraSearch]);

  const handleResolve = async (id: number) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
    } finally {
      setResolvingId(null);
    }
  };

  const handleSimulate = async (eventType: string) => {
    setSimulating(true);
    try {
      await intelligenceApi.simulateDetection({
        camera_id: 'CAM-001',
        event_type: eventType,
      });
      refresh();
    } finally {
      setSimulating(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    } catch {
      return { time: ts, date: '' };
    }
  };

  const getSeverityClass = (sev: string) => {
    switch (sev?.toUpperCase()) {
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

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator red-glow" />
          <div>
            <h2 className="section-heading">Perimeter Threat Alerts</h2>
            <span className="section-caption">
              Active border security breaches, tripwire crossings, and correlated incidents
            </span>
          </div>
        </div>

        <div className="header-actions-group">
          <span className="active-alerts-highlight font-mono">
            ACTIVE ALERTS: {activeCount}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-tactical btn-sm"
            onClick={() => handleSimulate('VIRTUAL_FENCE_BREACH')}
            disabled={simulating}
          >
            ⚡ Test Breach Alert
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="alerts-summary-ribbon">
        <div className="ribbon-card">
          <span className="ribbon-label">ACTIVE ALERTS</span>
          <span className="ribbon-val text-amber font-mono">{activeCount}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">RESOLVED ALERTS</span>
          <span className="ribbon-val text-green font-mono">{resolvedAlerts.length}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">TOTAL RECORDED</span>
          <span className="ribbon-val text-primary font-mono">{alerts.length}</span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="tactical-filter-bar">
        <div className="filter-group">
          <span className="filter-label">STATUS:</span>
          <div className="filter-pills">
            {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">SEVERITY:</span>
          <div className="filter-pills">
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                className={`filter-pill ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="search-group">
          <input
            type="text"
            className="filter-search-input font-mono"
            placeholder="Search Camera or Threat Type..."
            value={cameraSearch}
            onChange={(e) => setCameraSearch(e.target.value)}
          />
          {cameraSearch && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setCameraSearch('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="modal-alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          <span>Alert API Error: {error}</span>
        </div>
      )}

      {/* Alerts Table / List */}
      <div className="tactical-table-card">
        {loading && alerts.length === 0 ? (
          <div className="table-loading-box">
            <div className="loading-spinner" />
            <span>Loading threat intelligence alerts...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="table-empty-box">
            <div className="empty-icon">🛡</div>
            <h3>
              {statusFilter === 'ACTIVE' || statusFilter === 'ALL'
                ? 'ACTIVE ALERTS: 0'
                : 'No alerts matching criteria'}
            </h3>
            <p>
              Perimeter security nodes report zero active intrusions. New HIGH and CRITICAL detections will appear automatically.
            </p>
            <div className="test-quick-bar">
              <span className="quick-label">Trigger Test Threat:</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSimulate('VIRTUAL_FENCE_BREACH')}
              >
                Virtual Fence Breach
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSimulate('RESTRICTED_ZONE_ENTRY')}
              >
                Restricted Zone Entry
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSimulate('SUSPICIOUS_SEQUENCE')}
              >
                Suspicious Sequence (CRITICAL)
              </button>
            </div>
          </div>
        ) : (
          <div className="tactical-table-wrapper">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>SEVERITY</th>
                  <th>THREAT EVENT</th>
                  <th>CAMERA ID</th>
                  <th>CONFIDENCE</th>
                  <th>TIMESTAMP</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const { time, date } = formatTimestamp(alert.timestamp);
                  const isResolved = alert.status === 'RESOLVED';

                  return (
                    <tr
                      key={alert.id}
                      className={`alert-row ${isResolved ? 'resolved-row' : 'active-row'} severity-${alert.severity.toLowerCase()}`}
                    >
                      <td className="font-mono text-muted">#{alert.id}</td>
                      <td>
                        <span className={`severity-tag ${getSeverityClass(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        <div className="threat-cell">
                          <strong className="threat-name">
                            {alert.event_type.replace(/_/g, ' ')}
                          </strong>
                          {alert.details && (
                            <span className="threat-detail text-muted">
                              {String((alert.details as Record<string, unknown>).rule || '')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="camera-pill font-mono">{alert.camera_id}</span>
                      </td>
                      <td>
                        <span className="conf-pill font-mono">
                          {alert.confidence ? `${(alert.confidence * 100).toFixed(0)}%` : '92%'}
                        </span>
                      </td>
                      <td>
                        <div className="time-cell font-mono">
                          <span className="time-primary">{time}</span>
                          <span className="time-secondary text-muted">{date}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${isResolved ? 'status-resolved' : 'status-active'}`}
                        >
                          ● {alert.status}
                        </span>
                      </td>
                      <td>
                        {!isResolved ? (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm font-mono"
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolvingId === alert.id}
                          >
                            {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                          </button>
                        ) : (
                          <span className="text-muted font-mono text-sm">Resolved ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
