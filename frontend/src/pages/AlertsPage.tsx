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

  return (
    <div className="page-container alerts-page-forge">
      {/* Top Header */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h2 className="section-heading font-display">Perimeter Threat Incident Registry</h2>
            <span className="section-caption font-mono">
              REAL-TIME BORDER INTRUSION ALERTS // TRACE AUDIT & ESCALATION CONTROL
            </span>
          </div>
        </div>

        <div className="header-actions-group font-mono" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void handleRefresh()}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Syncing...' : '↻ Sync Alerts'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-forge-deploy"
            onClick={() => handleSimulate('VIRTUAL_FENCE_BREACH')}
            disabled={simulating}
          >
            ⚡ Test Breach Incident
          </button>
        </div>
      </div>

      {/* Stats Summary Ribbon */}
      <div className="overview-kpi-cluster mb-4">
        <div className="forge-kpi">
          <span className="kpi-label font-mono">TOTAL ALERTS</span>
          <div className="kpi-value-row">
            <strong className="kpi-value font-mono text-cream">{alerts.length}</strong>
          </div>
        </div>
        <div className={`forge-kpi ${activeCount > 0 ? 'status-warn' : ''}`}>
          <span className="kpi-label font-mono">ACTIVE INCIDENTS</span>
          <div className="kpi-value-row">
            <strong className="kpi-value font-mono text-rust">{activeCount}</strong>
          </div>
        </div>
        <div className={`forge-kpi ${criticalCount > 0 ? 'status-critical' : ''}`}>
          <span className="kpi-label font-mono">CRITICAL SEVERITY</span>
          <div className="kpi-value-row">
            <strong className="kpi-value font-mono text-critical">{criticalCount}</strong>
          </div>
        </div>
        <div className="forge-kpi">
          <span className="kpi-label font-mono">HIGH SEVERITY</span>
          <div className="kpi-value-row">
            <strong className="kpi-value font-mono text-orange">{highCount}</strong>
          </div>
        </div>
        <div className="forge-kpi">
          <span className="kpi-label font-mono">RESOLVED LOGS</span>
          <div className="kpi-value-row">
            <strong className="kpi-value font-mono text-green">{resolvedAlerts.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="fleet-controls-bar">
        <div className="fleet-search-wrap">
          <input
            type="text"
            className="fleet-search-input font-mono"
            placeholder="Filter by Camera ID or Threat Type..."
            value={cameraSearch}
            onChange={(e) => setCameraSearch(e.target.value)}
          />
        </div>

        <div className="fleet-filter-group font-mono">
          <select
            className="forge-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AlertStatus)}
          >
            <option value="ACTIVE">STATUS: ACTIVE ({activeCount})</option>
            <option value="ALL">STATUS: ALL ({alerts.length})</option>
            <option value="RESOLVED">STATUS: RESOLVED ({resolvedAlerts.length})</option>
          </select>

          <select
            className="forge-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | Severity)}
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="backend-offline-banner mb-3 font-mono">
          <span className="banner-icon">⚠</span>
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-xs" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {/* Main Alert List */}
      {loading && alerts.length === 0 ? (
        <div className="surveillance-empty-state font-mono">
          <span className="empty-spinner">↻</span>
          <span>QUERYING ACTIVE THREAT ALERTS...</span>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="surveillance-empty-state font-mono">
          <span className="text-green text-lg font-bold">✓ PERIMETER SECURE</span>
          <p className="text-muted">No alerts matching the selected filter criteria are currently on file.</p>
        </div>
      ) : (
        <div className="threat-feed-structured">
          {filteredAlerts.map((alert) => {
            const { time, date } = formatTimestamp(alert.timestamp);
            const isCritical = alert.severity?.toUpperCase() === 'CRITICAL';
            return (
              <div
                key={alert.id}
                className={`tactical-panel-card alert-card-item severity-${alert.severity.toLowerCase()} ${
                  isCritical ? 'border-critical' : ''
                }`}
              >
                <div className="alert-card-inner">
                  <div className="alert-card-header font-mono text-xs">
                    <div className="alert-header-left">
                      <span className={`threat-sev-badge ${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                      <strong className="alert-cam font-bold text-cream">{alert.camera_id}</strong>
                      <span className="alert-time text-muted">
                        {time} {date && `• ${date}`}
                      </span>
                    </div>

                    <div className="alert-header-right">
                      <span className={`status-pill status-${alert.status.toLowerCase()}`}>
                        [{alert.status}]
                      </span>
                    </div>
                  </div>

                  <div className="alert-card-body">
                    <h4 className="alert-type-title font-sans">
                      {alert.event_type.replace(/_/g, ' ')}
                    </h4>
                    {alert.details && (
                      <p className="alert-desc text-muted font-mono text-xs">
                        {typeof alert.details === 'string' ? alert.details : JSON.stringify(alert.details)}
                      </p>
                    )}
                    {alert.confidence && (
                      <div className="alert-confidence-pill font-mono text-xs text-muted">
                        AI CONFIDENCE SCORE: <strong className="text-cream">{(alert.confidence * 100).toFixed(0)}%</strong>
                      </div>
                    )}
                  </div>

                  <div className="alert-card-footer font-mono">
                    <a
                      href={`/surveillance?camera=${alert.camera_id}`}
                      className="btn btn-secondary btn-xs"
                      title="Inspect camera on Live Surveillance stage"
                    >
                      View Live Node 📹
                    </a>

                    {alert.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-xs"
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolvingId === alert.id}
                        title="Mark alert as acknowledged and resolved"
                      >
                        {resolvingId === alert.id ? 'Resolving...' : 'Acknowledge & Resolve ✓'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}