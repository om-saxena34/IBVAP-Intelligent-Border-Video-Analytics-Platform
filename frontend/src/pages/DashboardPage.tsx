import { useCallback, useEffect, useState } from 'react';
import { useHealth } from '../hooks/useHealth';
import { useStreams } from '../hooks/useStreams';
import { alertsApi, eventsApi, apiClient } from '../api/client';
import type { Alert, Event } from '../api/client';

import StatCard from '../components/StatCard';
import CameraGrid from '../components/CameraGrid';
import AlertPanel from '../components/AlertPanel';
import CapabilityGrid from '../components/CapabilityCard';
import SystemInfo from '../components/SystemInfo';

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
  onNotify,
}: DashboardPageProps) {
  const {
    health,
    loading: healthLoading,
    error: healthError,
    lastUpdated,
    refresh: refreshHealth,
  } = useHealth(8000);

  const {
    streams,
    loading: streamsLoading,
    error: streamsError,
    refresh: refreshStreams,
  } = useStreams(4000);

  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryData | null>(null);

  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Load dashboard telemetry & summary                                       */
  /* ------------------------------------------------------------------------ */

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

      // Also get all events for the recent events table
      const listRes = await eventsApi.list();
      if (listRes.ok) {
        setAllEvents(listRes.data.events);
      }

      if (summaryResponse.ok && summaryResponse.data?.summary) {
        setAnalyticsSummary(summaryResponse.data.summary);
      }

      setTelemetryError(null);
    } catch {
      setTelemetryError('Unable to load alert/event telemetry.');
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTelemetry();
    const interval = window.setInterval(() => {
      void refreshTelemetry();
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshTelemetry]);

  /* ------------------------------------------------------------------------ */
  /* Camera callbacks                                                         */
  /* ------------------------------------------------------------------------ */

  const handleCameraDisconnected = useCallback(
    (cameraId: string) => {
      onNotify(`Camera stream "${cameraId}" disconnected.`, 'success');
      refreshStreams();
      refreshHealth();
    },
    [onNotify, refreshStreams, refreshHealth]
  );

  const handleCameraError = useCallback(
    (err: string) => {
      onNotify(err, 'error');
    },
    [onNotify]
  );

  /* ------------------------------------------------------------------------ */
  /* Camera statistics                                                        */
  /* ------------------------------------------------------------------------ */

  const totalCameras = streams.length;
  const onlineCameras = streams.filter((s) => s.status === 'ONLINE').length;

  // Person and vehicle counts from backend summary or fallback
  const personsDetected = analyticsSummary?.persons_detected ?? 0;
  const vehiclesDetected = analyticsSummary?.vehicles_detected ?? 0;

  const criticalAlerts = activeAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const highAlerts = activeAlerts.filter((a) => a.severity === 'HIGH').length;

  const formatEventTime = (timestamp: string) => {
    const d = new Date(timestamp);
    return Number.isNaN(d.getTime()) ? timestamp : d.toLocaleTimeString();
  };

  const formatEventDate = (timestamp: string) => {
    const d = new Date(timestamp);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  };

  return (
    <div className="page-container">
      {/* ------------------------------------------------------------------ */}
      {/* Top 6 Summary Statistics Cards                                      */}
      {/* ------------------------------------------------------------------ */}

      <section className="stat-cards-grid grid-cols-6" aria-label="Surveillance Key Metrics">
        <StatCard
          title="Total Cameras"
          value={totalCameras}
          sub={
            totalCameras === 0
              ? 'No registered surveillance nodes'
              : `${totalCameras} configured border node${totalCameras === 1 ? '' : 's'}`
          }
          accent="blue"
          icon="📹"
        />

        <StatCard
          title="Online Cameras"
          value={onlineCameras}
          sub={
            totalCameras === 0
              ? 'Standby'
              : onlineCameras === totalCameras
              ? 'All feeds active'
              : `${totalCameras - onlineCameras} offline`
          }
          accent="green"
          icon="⚡"
          badge={onlineCameras > 0 ? 'ACTIVE' : undefined}
        />

        <StatCard
          title="Active Alerts"
          value={telemetryLoading ? '...' : activeAlerts.length}
          sub={
            activeAlerts.length === 0
              ? 'Perimeter secure'
              : `${criticalAlerts} critical, ${highAlerts} high`
          }
          accent={activeAlerts.length > 0 ? 'amber' : 'green'}
          icon="🚨"
          badge={activeAlerts.length > 0 ? 'LIVE' : undefined}
        />

        <StatCard
          title="Events Today"
          value={telemetryLoading ? '...' : todayEvents.length}
          sub="Border intelligence events"
          accent="gray"
          icon="📋"
        />

        <StatCard
          title="Persons Detected"
          value={telemetryLoading ? '...' : personsDetected}
          sub="Tracked pedestrian targets"
          accent="blue"
          icon="👤"
        />

        <StatCard
          title="Vehicles Detected"
          value={telemetryLoading ? '...' : vehiclesDetected}
          sub="Tracked motorized targets"
          accent="red"
          icon="🚗"
        />
      </section>

      {/* Critical Telemetry Warning */}
      {telemetryError && (
        <div className="modal-alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          <span>{telemetryError}</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => void refreshTelemetry()}
          >
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Live Surveillance Feeds                                             */}
      {/* ------------------------------------------------------------------ */}

      <section className="dashboard-section" aria-label="Live Video Grid">
        <div className="section-header-bar">
          <div className="section-title-wrap">
            <span className="section-indicator" />
            <div>
              <h3 className="section-heading">Live Border Surveillance</h3>
              <span className="section-caption font-mono">
                {streams.length === 0
                  ? 'NO CHANNELS CONNECTED'
                  : `${streams.length} ACTIVE STREAM${streams.length === 1 ? '' : 'S'} // AI DETECTIONS ENABLED`}
              </span>
            </div>
          </div>

          <div className="section-actions">
            <button
              type="button"
              className="btn btn-primary btn-tactical btn-sm"
              onClick={onOpenConnectModal}
            >
              + Connect Camera Stream
            </button>
          </div>
        </div>

        {streamsError && (
          <div className="modal-alert-error" role="alert">
            <span className="alert-icon">⚠</span>
            <span>Error fetching streams: {streamsError}</span>
          </div>
        )}

        <CameraGrid
          streams={streams}
          loading={streamsLoading}
          onOpenConnectModal={onOpenConnectModal}
          onCameraDisconnected={handleCameraDisconnected}
          onError={handleCameraError}
          showFilters={streams.length > 0}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Alerts + System Telemetry Dual Panel                         */}
      {/* ------------------------------------------------------------------ */}

      <div className="dashboard-grid-dual">
        <AlertPanel />

        <SystemInfo
          health={health}
          loading={healthLoading}
          error={healthError}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom Panel: Recent Security Events Audit Feed                     */}
      {/* ------------------------------------------------------------------ */}

      <section className="dashboard-section" aria-label="Recent Security Events Audit">
        <div className="section-header-bar">
          <div className="section-title-wrap">
            <span className="section-indicator" />
            <div>
              <h3 className="section-heading">Recent Security Events Log</h3>
              <span className="section-caption font-mono">
                CHRONOLOGICAL BORDER AUDIT TRAIL // REAL-TIME INFERENCE LOG
              </span>
            </div>
          </div>
          <span className="count-pill font-mono">{allEvents.length} TOTAL RECORDED</span>
        </div>

        <div className="table-responsive border-tactical" style={{ borderRadius: '4px', overflow: 'hidden' }}>
          <table className="tactical-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>DATE</th>
                <th>CAMERA / SENSOR</th>
                <th>EVENT CLASSIFICATION</th>
                <th>SEVERITY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {allEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No security events recorded yet. Connect a camera feed to start border monitoring.
                  </td>
                </tr>
              ) : (
                allEvents.slice(0, 8).map((evt) => (
                  <tr key={evt.id}>
                    <td className="font-mono">{formatEventTime(evt.timestamp)}</td>
                    <td className="font-mono text-muted">{formatEventDate(evt.timestamp)}</td>
                    <td className="font-mono font-bold text-cyan">{evt.camera_id}</td>
                    <td className="font-mono">
                      {evt.event_type.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td>
                      <span className={`severity-badge severity-${evt.severity.toLowerCase()} font-mono`}>
                        {evt.severity}
                      </span>
                    </td>
                    <td>
                      <span className="status-pill-logged font-mono">LOGGED</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* AI Detection Capabilities Matrix                                    */}
      {/* ------------------------------------------------------------------ */}

      <CapabilityGrid />
    </div>
  );
}