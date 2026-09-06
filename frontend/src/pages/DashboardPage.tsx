import { useState, useCallback, useMemo } from 'react';
import { useHealth } from '../hooks/useHealth';
import { useStreams } from '../hooks/useStreams';
import { useAlerts } from '../hooks/useAlerts';
import { useEvents } from '../hooks/useEvents';

import StatCard from '../components/StatCard';
import CameraGrid from '../components/CameraGrid';
import AlertPanel from '../components/AlertPanel';
import CapabilityGrid from '../components/CapabilityCard';
import SystemInfo from '../components/SystemInfo';
import VirtualFenceModal from '../components/VirtualFenceModal';

interface DashboardPageProps {
  onOpenConnectModal: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export default function DashboardPage({
  onOpenConnectModal,
  onNotify,
}: DashboardPageProps) {
  const [isFenceModalOpen, setIsFenceModalOpen] = useState<boolean>(false);
  const [selectedCameraForFence, setSelectedCameraForFence] = useState<string>('CAM-001');

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
  } = useStreams(5000);

  const {
    alerts,
    activeAlerts,
    activeCount: activeAlertsCount,
    loading: alertsLoading,
    error: alertsError,
    refresh: refreshAlerts,
  } = useAlerts(4000);

  const {
    events,
    loading: eventsLoading,
    error: eventsError,
    refresh: refreshEvents,
  } = useEvents(4000);

  const criticalAlerts = useMemo(
    () => activeAlerts.filter((alert) => alert.severity === 'CRITICAL').length,
    [activeAlerts]
  );

  const highAlerts = useMemo(
    () => activeAlerts.filter((alert) => alert.severity === 'HIGH').length,
    [activeAlerts]
  );

  const todayEvents = useMemo(() => {
    const now = new Date();
    return events.filter((event) => {
      const timestamp = new Date(event.timestamp);
      return (
        timestamp.getDate() === now.getDate() &&
        timestamp.getMonth() === now.getMonth() &&
        timestamp.getFullYear() === now.getFullYear()
      );
    });
  }, [events]);

  const handleCameraDisconnected = useCallback(
    (cameraId: string) => {
      onNotify(
        `Camera stream "${cameraId}" disconnected.`,
        'success',
      );

      refreshStreams();
      refreshHealth();
    },
    [
      onNotify,
      refreshStreams,
      refreshHealth,
    ],
  );

  const handleCameraError = useCallback(
    (err: string) => {
      onNotify(err, 'error');
    },
    [onNotify],
  );

  const handleFenceEventTriggered = useCallback(
    (eventType: string, camId: string) => {
      onNotify(`Border Intelligence: ${eventType.replace(/_/g, ' ')} detected on ${camId}`, 'success');
      refreshAlerts();
      refreshEvents();
    },
    [onNotify, refreshAlerts, refreshEvents]
  );

  /* ------------------------------------------------------------------------ */
  /* Camera statistics                                                        */
  /* ------------------------------------------------------------------------ */

  const totalCameras = streams.length;

  const onlineCameras = streams.filter(
    (stream) =>
      stream.status === 'ONLINE',
  ).length;

  const offlineCameras = streams.filter(
    (stream) =>
      stream.status === 'OFFLINE',
  ).length;

  const reconnectingCameras = streams.filter(
    (stream) =>
      stream.status === 'RECONNECTING',
  ).length;

  const errorCameras = streams.filter(
    (stream) =>
      stream.status === 'ERROR',
  ).length;

  const onlineSubtitle =
    totalCameras === 0
      ? 'No active streams'
      : onlineCameras === totalCameras
        ? 'All streams operational'
        : `${totalCameras - onlineCameras} not streaming (${offlineCameras} offline${
            reconnectingCameras > 0
              ? `, ${reconnectingCameras} reconnecting`
              : ''
          }${
            errorCameras > 0
              ? `, ${errorCameras} error`
              : ''
          })`;

  const telemetryError = alertsError || eventsError;

  return (
    <div className="page-container">
      {/* ------------------------------------------------------------------ */}
      {/* Dashboard Statistics                                               */}
      {/* ------------------------------------------------------------------ */}

      <section
        className="stat-cards-grid"
        aria-label="Surveillance Statistics"
      >
        <StatCard
          title="Total Cameras"
          value={totalCameras}
          sub={
            totalCameras === 0
              ? 'No registered surveillance nodes'
              : `${totalCameras} configured border node${
                  totalCameras === 1
                    ? ''
                    : 's'
                }`
          }
          accent="blue"
          icon="📹"
        />

        <StatCard
          title="Online Cameras"
          value={onlineCameras}
          sub={onlineSubtitle}
          accent="green"
          icon="⚡"
          badge={
            onlineCameras > 0
              ? 'ACTIVE'
              : undefined
          }
        />

        <StatCard
          title="Active Alerts"
          value={
            alertsLoading && alerts.length === 0
              ? '...'
              : activeAlertsCount
          }
          sub={
            alertsError
              ? 'Telemetry unavailable'
              : activeAlertsCount === 0
                ? 'Perimeter secure'
                : `${criticalAlerts} critical, ${highAlerts} high`
          }
          accent={
            activeAlertsCount > 0
              ? 'amber'
              : 'green'
          }
          icon="🚨"
          badge={
            activeAlertsCount > 0
              ? 'THREAT'
              : 'SECURE'
          }
        />

        <StatCard
          title="Events Today"
          value={
            eventsLoading && events.length === 0
              ? '...'
              : todayEvents.length
          }
          sub={
            eventsError
              ? 'Telemetry unavailable'
              : todayEvents.length === 0
                ? 'No events recorded today'
                : `${events.length} total surveillance events`
          }
          accent="blue"
          icon="📋"
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Critical Telemetry                                                 */}
      {/* ------------------------------------------------------------------ */}

      {telemetryError && (
        <div
          className="modal-alert-error"
          role="alert"
        >
          <span className="alert-icon">
            ⚠
          </span>

          <span>
            {telemetryError}
          </span>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              void refreshAlerts();
              void refreshEvents();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Live Surveillance Feeds                                             */}
      {/* ------------------------------------------------------------------ */}

      <section
        className="dashboard-section"
        aria-label="Live Video Grid"
      >
        <div className="section-header-bar">
          <div className="section-title-wrap">
            <span className="section-indicator" />

            <div>
              <h3 className="section-heading">
                Live Surveillance Feeds
              </h3>

              <span className="section-caption">
                {streams.length === 0
                  ? 'No active streams detected'
                  : `${streams.length} registered stream channel${
                      streams.length === 1
                        ? ''
                        : 's'
                    }`}
              </span>
            </div>
          </div>

          <div className="header-action-buttons" style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-tactical btn-sm"
              onClick={() => {
                setSelectedCameraForFence(streams[0]?.camera_id || 'CAM-001');
                setIsFenceModalOpen(true);
              }}
            >
              🛡 Virtual Fence Inspector
            </button>
            <button
              type="button"
              className="btn btn-primary btn-tactical btn-sm"
              onClick={onOpenConnectModal}
            >
              + Connect Camera
            </button>
          </div>
        </div>

        {streamsError && (
          <div
            className="modal-alert-error"
            role="alert"
          >
            <span className="alert-icon">
              ⚠
            </span>

            <span>
              Error fetching streams:{' '}
              {streamsError}
            </span>
          </div>
        )}

        <CameraGrid
          streams={streams}
          loading={streamsLoading}
          onOpenConnectModal={
            onOpenConnectModal
          }
          onCameraDisconnected={
            handleCameraDisconnected
          }
          onError={handleCameraError}
          showFilters={streams.length > 0}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Alerts + System Telemetry                                    */}
      {/* ------------------------------------------------------------------ */}

      <div className="dashboard-grid-dual">
        <AlertPanel onResolveSuccess={() => { refreshAlerts(); refreshEvents(); }} />
        <SystemInfo
          health={health}
          loading={healthLoading}
          error={healthError}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AI Detection Capabilities                                           */}
      {/* ------------------------------------------------------------------ */}

      <CapabilityGrid />

      {/* Virtual Fence / Border Intelligence Modal */}
      <VirtualFenceModal
        isOpen={isFenceModalOpen}
        onClose={() => setIsFenceModalOpen(false)}
        selectedCameraId={selectedCameraForFence}
        onTriggerEvent={handleFenceEventTriggered}
      />
    </div>
  );
}