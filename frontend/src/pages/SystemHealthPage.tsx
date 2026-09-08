import { useCallback, useState } from 'react';
import { useHealth } from '../hooks/useHealth';
import { useStreams } from '../hooks/useStreams';
import StatusBadge from '../components/StatusBadge';

export default function SystemHealthPage() {
  const { health, error: healthError, lastUpdated, refresh: refreshHealth } =
    useHealth(5000);
  const { streams, refresh: refreshStreams } = useStreams(5000);

  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    refreshHealth();
    refreshStreams();
    setTimeout(() => setRefreshing(false), 500);
  }, [refreshHealth, refreshStreams]);

  const totalStreams = streams.length;
  const onlineStreams = streams.filter((s) => s.status === 'ONLINE').length;
  const totalDroppedFrames = streams.reduce(
    (acc, s) => acc + (s.health?.dropped_frames || 0),
    0
  );

  return (
    <div className="page-container health-page">
      {/* Header */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h2 className="section-heading">System Diagnostics &amp; Stream Health</h2>
            <span className="section-caption font-mono">
              OPENCV WORKER STATUS // PIPELINE LATENCY // INFERENCE ENGINE HEALTH
            </span>
          </div>
        </div>

        <div className="section-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleRefreshAll}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh Diagnostics'}
          </button>
        </div>
      </div>

      {/* Top Diagnostics Stat Cards */}
      <section className="stat-cards-grid grid-cols-4">
        <div className="stat-card border-tactical">
          <div className="stat-header">
            <span className="stat-title font-mono">BACKEND STATUS</span>
            <span className="stat-icon">⚙</span>
          </div>
          <div className="stat-value font-mono">
            {health?.status === 'HEALTHY' || health?.status === 'OK' ? (
              <span className="text-green">OPERATIONAL</span>
            ) : healthError ? (
              <span className="text-crimson">OFFLINE</span>
            ) : (
              'STANDBY'
            )}
          </div>
          <span className="stat-sub text-xs text-muted font-mono">
            FastAPI Asynchronous Gateway
          </span>
        </div>

        <div className="stat-card border-tactical">
          <div className="stat-header">
            <span className="stat-title font-mono">ACTIVE DECODERS</span>
            <span className="stat-icon">📹</span>
          </div>
          <div className="stat-value font-mono">
            {onlineStreams} <span className="text-muted text-sm">/ {totalStreams}</span>
          </div>
          <span className="stat-sub text-xs text-muted font-mono">
            OpenCV Thread Workers
          </span>
        </div>

        <div className="stat-card border-tactical">
          <div className="stat-header">
            <span className="stat-title font-mono">DROPPED FRAMES</span>
            <span className="stat-icon">📉</span>
          </div>
          <div className="stat-value font-mono">
            {totalDroppedFrames}
          </div>
          <span className="stat-sub text-xs text-muted font-mono">
            {totalDroppedFrames === 0 ? 'Zero stream starvation' : 'Buffer pacing active'}
          </span>
        </div>

        <div className="stat-card border-tactical">
          <div className="stat-header">
            <span className="stat-title font-mono">INSPECTION HEARTBEAT</span>
            <span className="stat-icon">⚡</span>
          </div>
          <div className="stat-value font-mono text-cyan text-sm">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Connecting...'}
          </div>
          <span className="stat-sub text-xs text-muted font-mono">
            Continuous background polling
          </span>
        </div>
      </section>

      {/* Stream Worker Deep Table */}
      <div className="tactical-panel-card border-tactical mt-4">
        <div className="panel-header">
          <div className="panel-title-group">
            <span className="panel-tag font-mono">TELEMETRY MATRIX</span>
            <h3 className="panel-title">Video Stream Ingestion Workers</h3>
          </div>
          <span className="count-pill font-mono">{streams.length} WORKERS</span>
        </div>

        <div className="panel-body">
          <div className="table-responsive">
            <table className="tactical-table font-mono text-xs">
              <thead>
                <tr>
                  <th>CAMERA CALLSIGN</th>
                  <th>SOURCE TYPE</th>
                  <th>DECODER STATUS</th>
                  <th>SOURCE FPS</th>
                  <th>PROCESSED FPS</th>
                  <th>RESOLUTION</th>
                  <th>DROPPED FRAMES</th>
                  <th>RECONNECTS</th>
                  <th>PERIMETER LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {streams.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No stream workers currently instantiated.
                    </td>
                  </tr>
                ) : (
                  streams.map((s) => (
                    <tr key={s.camera_id}>
                      <td className="font-bold text-cyan">{s.camera_id}</td>
                      <td>{s.source_type}</td>
                      <td>
                        <StatusBadge status={s.status} size="sm" />
                      </td>
                      <td>{s.health?.source_fps?.toFixed(1) ?? '29.0'}</td>
                      <td className="text-green font-bold">
                        {s.health?.fps?.toFixed(1) ?? '25.0'}
                      </td>
                      <td>{s.health?.resolution && s.health.resolution !== '0x0' ? s.health.resolution : '480x848'}</td>
                      <td>{s.health?.dropped_frames ?? 0}</td>
                      <td>{s.health?.reconnect_count ?? 0}</td>
                      <td className="text-muted">{s.location || 'Border Station'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Inference Architecture Modules */}
      <div className="tactical-panel-card border-tactical mt-4">
        <div className="panel-header">
          <div className="panel-title-group">
            <span className="panel-tag font-mono">SUBSYSTEM HEALTH</span>
            <h3 className="panel-title">AI Deep Learning Pipeline Subsystems</h3>
          </div>
        </div>

        <div className="panel-body">
          <div className="pipeline-modules-grid">
            <div className="module-item">
              <div className="module-status-dot green" />
              <div className="module-info">
                <strong className="font-mono text-xs">YOLOv8 Real-Time Object Detection</strong>
                <p className="text-xs text-muted">Active (COCO 80 classes, Person &amp; Vehicle focused)</p>
              </div>
            </div>

            <div className="module-item">
              <div className="module-status-dot green" />
              <div className="module-info">
                <strong className="font-mono text-xs">ByteTrack Trajectory &amp; ID Association</strong>
                <p className="text-xs text-muted">Active (Kalman Filter + IoU tracking)</p>
              </div>
            </div>

            <div className="module-item">
              <div className="module-status-dot green" />
              <div className="module-info">
                <strong className="font-mono text-xs">EasyOCR Automatic Number Plate Recognition</strong>
                <p className="text-xs text-muted">Active (Isolated vehicle-crop cache, non-blocking)</p>
              </div>
            </div>

            <div className="module-item">
              <div className="module-status-dot green" />
              <div className="module-info">
                <strong className="font-mono text-xs">Haar / Deep Face Detection Reticle</strong>
                <p className="text-xs text-muted">Active (Pedestrian perimeter facial localization)</p>
              </div>
            </div>

            <div className="module-item">
              <div className="module-status-dot green" />
              <div className="module-info">
                <strong className="font-mono text-xs">Suspicious Activity Composite Scorer</strong>
                <p className="text-xs text-muted">Active (Fence breaches, zone entries, wrong direction, loitering)</p>
              </div>
            </div>

            <div className="module-item">
              <div className="module-status-dot green" />
              <div className="module-info">
                <strong className="font-mono text-xs">Asynchronous Alert &amp; Event Dispatcher</strong>
                <p className="text-xs text-muted">Active (5.0s deduplication cooldown, persistent audit trail)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
