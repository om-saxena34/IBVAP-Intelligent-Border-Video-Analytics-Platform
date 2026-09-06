import { useState, useMemo, useCallback } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { intelligenceApi } from '../api/intelligenceApi';
import type { Severity, AlertStatus } from '../api/alertsApi';

export default function AlertsPage() {
  const { alerts, resolvedAlerts, activeAlerts, activeCount, loading, error, refresh, resolveAlert } =
    useAlerts(3500);

  const [statusFilter, setStatusFilter] = useState<'ALL' | AlertStatus>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [cameraSearch, setCameraSearch] = useState<string>('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const criticalCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'CRITICAL').length,
    [activeAlerts]
  );

  const highCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'HIGH').length,
    [activeAlerts]
  );

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

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
              Real-time border intrusion alerts, tripwire breaches, and correlated tactical incidents
            </span>
          </div>
        </div>

        <div className="header-actions-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-tactical btn-sm"
            onClick={() => void handleRefresh()}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
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

      {/* Stats Summary Grid */}
      <div className="alerts-summary-ribbon" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
        <div className="ribbon-card">
          <span className="ribbon-label">TOTAL ALERTS</span>
          <span className="ribbon-val text-primary font-mono">{alerts.length}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">ACTIVE ALERTS</span>
          <span className="ribbon-val text-amber font-mono">{activeCount}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">CRITICAL</span>
          <span className="ribbon-val text-red font-mono" style={{ color: '#ef4444' }}>{criticalCount}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">HIGH</span>
          <span className="ribbon-val text-orange font-mono" style={{ color: '#f97316' }}>{highCount}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">RESOLVED</span>
          <span className="ribbon-val text-green font-mono">{resolvedAlerts.length}</span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="tactical-filter-bar">
        <div className="filter-group">
          <span className="filter-label">STATUS:</span>
          <div className="filter-pills">
            {(['ACTIVE', 'ALL', 'RESOLVED'] as const).map((st) => (
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

      {/* Error state */}
      {error && (
        <div className="modal-alert-error" role="alert" style={{ margin: '1rem 0' }}>
          <span className="alert-icon">⚠</span>
          <span>{error}</span>
          <button type="button" className="btn btn-sm" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {/* Main Alert List */}
      {loading && alerts.length === 0 ? (
        <div className="alert-loading-state" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Querying tactical alerts...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡</div>
          <h3>No Alerts Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            No alerts matching the selected filter criteria are currently on file.
          </p>
        </div>
      ) : (
        <div className="alerts-feed-list" style={{ marginTop: '1rem' }}>
          {filteredAlerts.map((alert) => {
            const { time, date } = formatTimestamp(alert.timestamp);
            return (
              <div
                key={alert.id}
                className={`alert-feed-item severity-${alert.severity.toLowerCase()}`}
              >
                <div className="alert-feed-left">
                  <span className={`severity-tag ${getSeverityClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <div className="alert-feed-meta">
                    <h4 className="alert-feed-type">
                      {alert.event_type.replace(/_/g, ' ')}
                    </h4>
                    <div className="alert-feed-sub">
                      <span className="alert-cam-id font-mono">🎥 {alert.camera_id}</span>
                      <span className="alert-time font-mono">🕒 {time} {date && `· ${date}`}</span>
                      {alert.confidence && (
                        <span className="alert-confidence font-mono">
                          ⚡ {(alert.confidence * 100).toFixed(0)}% CONF
                        </span>
                      )}
                      <span className={`status-pill status-${alert.status.toLowerCase()} font-mono`}>
                        [{alert.status}]
                      </span>
                    </div>
                  </div>
                </div>

                <div className="alert-feed-actions">
                  {alert.status === 'ACTIVE' && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm font-mono"
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      title="Mark alert as resolved"
                    >
                      {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}