import { useCallback, useEffect, useState } from 'react';

import { useHealth } from '../hooks/useHealth';
import { useStreams } from '../hooks/useStreams';

import { alertsApi, eventsApi } from '../api/client';

import type {
  Alert,
  Event,
} from '../api/client';

import StatCard from '../components/StatCard';
import CameraGrid from '../components/CameraGrid';
import AlertPanel from '../components/AlertPanel';
import CapabilityGrid from '../components/CapabilityCard';
import SystemInfo from '../components/SystemInfo';

interface DashboardPageProps {
  onOpenConnectModal: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
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
  } = useStreams(5000);

  const [activeAlerts, setActiveAlerts] =
    useState<Alert[]>([]);

  const [todayEvents, setTodayEvents] =
    useState<Event[]>([]);

  const [telemetryLoading, setTelemetryLoading] =
    useState(true);

  const [telemetryError, setTelemetryError] =
    useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Load dashboard telemetry                                                 */
  /* ------------------------------------------------------------------------ */

  const refreshTelemetry = useCallback(
    async () => {
      setTelemetryLoading(true);

      const [alertsResponse, eventsResponse] =
        await Promise.all([
          alertsApi.active(),
          eventsApi.today(),
        ]);

      let hasError = false;

      if (alertsResponse.ok) {
        setActiveAlerts(alertsResponse.data);
      } else {
        hasError = true;
      }

      if (eventsResponse.ok) {
        setTodayEvents(eventsResponse.data);
      } else {
        hasError = true;
      }

      if (hasError) {
        setTelemetryError(
          'Unable to load alert/event telemetry.',
        );
      } else {
        setTelemetryError(null);
      }

      setTelemetryLoading(false);
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /* Initial + automatic telemetry refresh                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    void refreshTelemetry();

    const interval = window.setInterval(() => {
      void refreshTelemetry();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshTelemetry]);

  /* ------------------------------------------------------------------------ */
  /* Camera callbacks                                                         */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Alert statistics                                                         */
  /* ------------------------------------------------------------------------ */

  const criticalAlerts =
    activeAlerts.filter(
      (alert) =>
        alert.severity === 'CRITICAL',
    ).length;

  const highAlerts =
    activeAlerts.filter(
      (alert) =>
        alert.severity === 'HIGH',
    ).length;

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
            telemetryLoading
              ? '...'
              : activeAlerts.length
          }
          sub={
            telemetryError
              ? 'Telemetry unavailable'
              : activeAlerts.length === 0
                ? 'No active threats'
                : `${criticalAlerts} critical, ${highAlerts} high`
          }
          accent={
            activeAlerts.length > 0
              ? 'amber'
              : 'green'
          }
          icon="🚨"
          badge={
            activeAlerts.length > 0
              ? 'LIVE'
              : undefined
          }
        />

        <StatCard
          title="Events Today"
          value={
            telemetryLoading
              ? '...'
              : todayEvents.length
          }
          sub={
            telemetryError
              ? 'Telemetry unavailable'
              : todayEvents.length === 0
                ? 'No events recorded today'
                : 'AI surveillance events recorded'
          }
          accent="gray"
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
            onClick={() =>
              void refreshTelemetry()
            }
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

          <button
            type="button"
            className="btn btn-primary btn-tactical btn-sm"
            onClick={onOpenConnectModal}
          >
            + Connect Camera
          </button>
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
        <AlertPanel />

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
    </div>
  );
}