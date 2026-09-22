import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHealth } from '../hooks/useHealth';
import { useStreams } from '../hooks/useStreams';
import { alertsApi, eventsApi, apiClient } from '../api/client';
import type { Alert, Event } from '../api/client';
import StatusBadge from '../components/StatusBadge';

interface DashboardPageProps {
  onOpenConnectModal: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

interface AnalyticsSummaryData {
  total_events: number;
  events_today: number;
  active_alerts: number;
  critical_events: number;
  high_events: number;
  medium_events: number;
  low_events: number;
  total_detections: number;
  cameras_analyzed: number;
  cameras_online: number;
  persons_detected: number;
  vehicles_detected: number;
}

export default function DashboardPage({
  onOpenConnectModal,
}: DashboardPageProps) {
  const navigate = useNavigate();

  const {
    health,
    loading: healthLoading,
    error: healthError,
    refresh: refreshHealth,
  } = useHealth(8000);

  const {
    streams,
    refresh: refreshStreams,
  } = useStreams(5000);

  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryData | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);

  const refreshTelemetry = useCallback(async () => {
    try {
      const [alertsResponse, eventsResponse, summaryResponse] = await Promise.all([
        alertsApi.active(),
        eventsApi.today(),
        apiClient.get<{ summary: AnalyticsSummaryData }>('/analytics/summary'),
      ]);

      if (alertsResponse.ok) {
        setActiveAlerts(alertsResponse.data);
      }
      if (eventsResponse.ok) {
        setTodayEvents(eventsResponse.data);
      }
      if (summaryResponse.ok && summaryResponse.data?.summary) {
        setAnalyticsSummary(summaryResponse.data.summary);
      }
    } catch {
      // Soft fail
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTelemetry();
    const interval = setInterval(refreshTelemetry, 4000);
    return () => clearInterval(interval);
  }, [refreshTelemetry]);

  const onlineCameras = streams.filter((s) => s.status?.toUpperCase() === 'ONLINE').length;
  const criticalAlerts = activeAlerts.filter((a) => a.severity?.toUpperCase() === 'CRITICAL');
  const highAlerts = activeAlerts.filter((a) => a.severity?.toUpperCase() === 'HIGH');

  const personsCount = analyticsSummary?.persons_detected ?? 0;
  const vehiclesCount = analyticsSummary?.vehicles_detected ?? 0;
  const totalDetections = analyticsSummary?.total_detections ?? 0;

  // Sector breakdown
  const sectorMap = useMemo(() => {
    const map: Record<string, { total: number; online: number; cameras: string[] }> = {};
    streams.forEach((s) => {
      const sec = s.sector || 'SECTOR-ALPHA';
      if (!map[sec]) {
        map[sec] = { total: 0, online: 0, cameras: [] };
      }
      map[sec].total += 1;
      if (s.status?.toUpperCase() === 'ONLINE') {
        map[sec].online += 1;
      }
      map[sec].cameras.push(s.camera_id);
    });
    return map;
  }, [streams]);

  const isHealthy = Boolean(health && !healthError && health.status?.toLowerCase() === 'healthy');

  return (
    <div className="page-container forge-dashboard">
      {/* ------------------------------------------------------------------ */}
      {/* 1. TOP OPERATIONAL HERO BAR                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="forge-overview-header">
        <div className="overview-headline-block">
          <div className="font-mono text-xs text-rust font-bold">
            INTELLIGENT BORDER VIDEO ANALYTICS PLATFORM // OPS CENTER
          </div>
          <h1 className="overview-title font-display">Perimeter Surveillance Overview</h1>
          <div className="overview-subline font-mono text-muted">
            DEFENSE COMMAND & SENSING GRID • CENTRAL CONTROL TERMINAL
          </div>
        </div>

        {/* Compact Key Operational Indicators */}
        <div className="overview-kpi-cluster">
          {/* System Status KPI */}
          <div className={`forge-kpi ${isHealthy ? 'status-ok' : 'status-warn'}`}>
            <span className="kpi-label font-mono">GATEWAY STATUS</span>
            <div className="kpi-value-row">
              <span className={`kpi-dot ${isHealthy ? 'green' : 'red'}`} />
              <strong className="kpi-value font-mono">
                {healthLoading ? 'SYNCING' : isHealthy ? 'OPERATIONAL' : 'DEGRADED'}
              </strong>
            </div>
          </div>

          {/* Active Nodes KPI */}
          <div className="forge-kpi">
            <span className="kpi-label font-mono">ACTIVE STREAMS</span>
            <div className="kpi-value-row">
              <strong className="kpi-value font-mono text-rust">
                {onlineCameras} <span className="text-muted">/ {streams.length}</span>
              </strong>
            </div>
          </div>

          {/* Critical Alerts KPI */}
          <div className={`forge-kpi ${criticalAlerts.length > 0 ? 'status-critical' : ''}`}>
            <span className="kpi-label font-mono">ACTIVE THREATS</span>
            <div className="kpi-value-row">
              <strong className="kpi-value font-mono">
                {criticalAlerts.length > 0 ? (
                  <span className="text-critical">{criticalAlerts.length} CRITICAL</span>
                ) : highAlerts.length > 0 ? (
                  <span className="text-amber">{highAlerts.length} HIGH</span>
                ) : (
                  <span className="text-green">0 THREATS</span>
                )}
              </strong>
            </div>
          </div>

          {/* Detections Total KPI */}
          <div className="forge-kpi">
            <span className="kpi-label font-mono">TOTAL DETECTIONS</span>
            <div className="kpi-value-row">
              <strong className="kpi-value font-mono text-cream">
                {telemetryLoading ? '...' : totalDetections}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. PRIMARY OPERATIONAL ACTIVITY VISUALIZATION                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="forge-main-display border-tactical">
        <div className="display-header">
          <div className="display-title-group">
            <span className="display-tag font-mono">C2 SENSING MATRIX</span>
            <h2 className="display-title font-display">Perimeter Sector Security Matrix</h2>
          </div>
          <div className="display-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-xs font-mono"
              onClick={() => {
                refreshHealth();
                refreshStreams();
                refreshTelemetry();
              }}
            >
              ↻ Sync Telemetry
            </button>
            <button
              type="button"
              className="btn btn-primary btn-xs font-mono"
              onClick={() => navigate('/surveillance')}
            >
              Launch Live Grid →
            </button>
          </div>
        </div>

        <div className="display-body">
          {streams.length === 0 ? (
            <div className="display-empty-state font-mono">
              <span className="empty-glyph">⌧</span>
              <p>NO SURVEILLANCE NODES CONNECTED</p>
              <span className="text-muted text-xs">
                Deploy a CCTV stream or sample preset to activate the perimeter sensing matrix.
              </span>
              <button
                type="button"
                className="btn btn-primary btn-forge-deploy mt-3"
                onClick={onOpenConnectModal}
              >
                + Connect First Surveillance Camera
              </button>
            </div>
          ) : (
            <div className="sector-matrix-grid">
              {Object.entries(sectorMap).map(([sectorName, secData]) => {
                const sectorOnline = secData.online > 0;
                return (
                  <div
                    key={sectorName}
                    className={`sector-card ${sectorOnline ? 'sector-active' : 'sector-dormant'}`}
                  >
                    <div className="sector-card-top">
                      <span className="sector-badge font-mono">
                        {sectorName.toUpperCase()}
                      </span>
                      <span className={`sector-status-pill font-mono ${sectorOnline ? 'active' : 'dormant'}`}>
                        {secData.online}/{secData.total} ONLINE
                      </span>
                    </div>

                    <div className="sector-radar-sweep">
                      <div className="radar-grid-lines" />
                      <div className={`radar-scanner ${sectorOnline ? 'sweeping' : ''}`} />
                      <div className="radar-nodes-overlay">
                        {secData.cameras.map((camId, idx) => {
                          const sObj = streams.find((s) => s.camera_id === camId);
                          const isOnline = sObj?.status?.toUpperCase() === 'ONLINE';
                          return (
                            <div
                              key={camId}
                              className={`radar-node-pip ${isOnline ? 'pip-online' : 'pip-offline'}`}
                              title={`${camId} (${sObj?.status || 'OFFLINE'})`}
                              style={{
                                left: `${20 + (idx % 3) * 30}%`,
                                top: `${25 + Math.floor(idx / 3) * 35}%`,
                              }}
                              onClick={() => navigate(`/surveillance?camera=${camId}`)}
                            >
                              <span className="pip-pulse" />
                              <span className="pip-label font-mono">{camId}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="sector-footer font-mono text-xs">
                      <span className="text-muted">COVERAGE:</span>
                      <span className="text-cream">
                        {Math.round((secData.online / secData.total) * 100)}% ACTIVE
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. THREE SUPPORTING MODULES (Grid 3-Column)                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="forge-supporting-grid">
        {/* Module A: Active Threat Feeds */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">PERIMETER THREATS</span>
              <h3 className="panel-title">Active Threat Queue</h3>
            </div>
            <span className={`count-pill font-mono ${activeAlerts.length > 0 ? 'critical' : 'neutral'}`}>
              {activeAlerts.length}
            </span>
          </div>

          <div className="panel-body">
            {activeAlerts.length === 0 ? (
              <div className="panel-empty-state font-mono">
                <span className="text-green font-bold">✓ SECURE</span>
                <span className="text-muted text-xs">No active alerts triggered</span>
              </div>
            ) : (
              <div className="threat-feed-list font-mono text-xs">
                {activeAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`threat-item ${alert.severity?.toLowerCase()}`}
                    onClick={() => navigate('/alerts')}
                  >
                    <div className="threat-item-top">
                      <span className={`threat-sev-badge ${alert.severity?.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                      <span className="threat-cam font-bold">{alert.camera_id}</span>
                      <span className="threat-time text-muted">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="threat-desc text-cream">{alert.details || alert.event_type.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel-footer">
            <button
              type="button"
              className="btn btn-secondary btn-xs font-mono w-full"
              onClick={() => navigate('/alerts')}
            >
              View All Threat Logs ({activeAlerts.length}) →
            </button>
          </div>
        </div>

        {/* Module B: Camera Nodes Summary */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">INGESTION NODES</span>
              <h3 className="panel-title">Camera Nodes Health</h3>
            </div>
            <span className="count-pill font-mono">{streams.length} NODES</span>
          </div>

          <div className="panel-body">
            {streams.length === 0 ? (
              <div className="panel-empty-state font-mono">
                <span className="text-muted">No cameras registered</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs mt-2"
                  onClick={onOpenConnectModal}
                >
                  Deploy Node
                </button>
              </div>
            ) : (
              <div className="node-health-list font-mono text-xs">
                {streams.slice(0, 6).map((s) => (
                  <div
                    key={s.camera_id}
                    className="node-row"
                    onClick={() => navigate(`/surveillance?camera=${s.camera_id}`)}
                  >
                    <div className="node-row-left">
                      <span className={`node-dot ${s.status?.toLowerCase() === 'online' ? 'green' : 'red'}`} />
                      <strong className="text-cream">{s.camera_id}</strong>
                      <span className="text-muted">{s.sector || s.location || 'Perimeter'}</span>
                    </div>
                    <div className="node-row-right">
                      <StatusBadge status={s.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel-footer">
            <button
              type="button"
              className="btn btn-secondary btn-xs font-mono w-full"
              onClick={() => navigate('/cameras')}
            >
              Manage Camera Fleet ({streams.length}) →
            </button>
          </div>
        </div>

        {/* Module C: Detection Distribution */}
        <div className="tactical-panel-card border-tactical">
          <div className="panel-header">
            <div className="panel-title-group">
              <span className="panel-tag font-mono">AI CLASSIFICATIONS</span>
              <h3 className="panel-title">Detection Breakdown</h3>
            </div>
            <span className="count-pill font-mono">{totalDetections} TOTAL</span>
          </div>

          <div className="panel-body">
            {totalDetections === 0 ? (
              <div className="panel-empty-state font-mono">
                <span className="text-muted">Waiting for camera detections</span>
                <span className="text-muted text-xs">Connect stream to capture targets</span>
              </div>
            ) : (
              <div className="detection-breakdown font-mono text-xs">
                <div className="detection-row">
                  <div className="detection-label-group">
                    <span className="detection-icon">👤</span>
                    <span>PERSONS / PEDESTRIANS</span>
                  </div>
                  <strong className="detection-value text-rust">{personsCount}</strong>
                </div>

                <div className="detection-row">
                  <div className="detection-label-group">
                    <span className="detection-icon">🚗</span>
                    <span>VEHICLES / CONVOYS</span>
                  </div>
                  <strong className="detection-value text-orange">{vehiclesCount}</strong>
                </div>

                <div className="detection-row">
                  <div className="detection-label-group">
                    <span className="detection-icon">⚡</span>
                    <span>EVENTS TODAY</span>
                  </div>
                  <strong className="detection-value text-amber">{todayEvents.length}</strong>
                </div>

                <div className="detection-row">
                  <div className="detection-label-group">
                    <span className="detection-icon">🛡</span>
                    <span>ANALYTICS ENGINES</span>
                  </div>
                  <strong className="detection-value text-green">11 ACTIVE</strong>
                </div>
              </div>
            )}
          </div>
          <div className="panel-footer">
            <button
              type="button"
              className="btn btn-secondary btn-xs font-mono w-full"
              onClick={() => navigate('/analytics')}
            >
              Full Intelligence Analytics →
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. RECENT EVENT STREAM TIMELINE                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="tactical-panel-card border-tactical mt-4">
        <div className="panel-header">
          <div className="panel-title-group">
            <span className="panel-tag font-mono">AUDIT TRAIL</span>
            <h3 className="panel-title">Live Operational Event Stream</h3>
          </div>
          <span className="count-pill font-mono">TODAY: {todayEvents.length}</span>
        </div>

        <div className="panel-body p-0">
          <div className="table-responsive">
            <table className="tactical-table text-xs font-mono">
              <thead>
                <tr>
                  <th>TIME (UTC)</th>
                  <th>CAMERA</th>
                  <th>EVENT TYPE</th>
                  <th>SEVERITY</th>
                  <th>DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                {todayEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No events recorded today. Standing by for telemetry.
                    </td>
                  </tr>
                ) : (
                  todayEvents.slice(0, 8).map((ev) => (
                    <tr key={ev.id}>
                      <td className="text-muted">{new Date(ev.timestamp).toLocaleTimeString()}</td>
                      <td className="text-cream font-bold">{ev.camera_id}</td>
                      <td className="text-rust">{ev.event_type.replace(/_/g, ' ')}</td>
                      <td>
                        <span className={`threat-sev-badge ${ev.severity?.toLowerCase()}`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="text-secondary">{ev.event_type.replace(/_/g, ' ')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}