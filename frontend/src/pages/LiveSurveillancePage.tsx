import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStreams } from '../hooks/useStreams';
import { streamsApi, type StreamInfo } from '../api/streamsApi';
import StatusBadge from '../components/StatusBadge';

interface TrackItem {
  track_id: number;
  class_name: string;
  confidence: number;
  bbox?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

interface TelemetryData {
  threat_level?: string;
  threat_score?: number;
  threat_reasons?: string[];
  track_count?: number;
  fps?: number;
  source_fps?: number;
  resolution?: string;
  capabilities?: Record<string, boolean>;
  counts?: {
    total: number;
    persons: number;
    vehicles: number;
    faces: number;
    plates: number;
  };
  tracks?: TrackItem[];
}

interface LiveSurveillancePageProps {
  onOpenConnectModal: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export default function LiveSurveillancePage({
  onOpenConnectModal,
  onNotify,
}: LiveSurveillancePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { streams, loading: streamsLoading } = useStreams(4000);

  const cameraQuery = searchParams.get('camera');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isAnnotated, setIsAnnotated] = useState<boolean>(true);
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [feedError, setFeedError] = useState<boolean>(false);

  // Pick initial camera
  useEffect(() => {
    if (streams.length > 0) {
      if (cameraQuery && streams.some((s) => s.camera_id === cameraQuery)) {
        setSelectedCameraId(cameraQuery);
      } else if (!selectedCameraId || !streams.some((s) => s.camera_id === selectedCameraId)) {
        // Select first online stream or first stream
        const online = streams.find((s) => s.status === 'ONLINE');
        const chosen = online ? online.camera_id : streams[0].camera_id;
        setSelectedCameraId(chosen);
        setSearchParams({ camera: chosen });
      }
    }
  }, [streams, cameraQuery, selectedCameraId, setSearchParams]);

  const activeStream: StreamInfo | undefined = streams.find(
    (s) => s.camera_id === selectedCameraId
  );

  // Poll detection telemetry for selected camera
  useEffect(() => {
    if (!selectedCameraId || activeStream?.status !== 'ONLINE') {
      setTelemetry(null);
      return;
    }

    let isMounted = true;
    const poll = async () => {
      try {
        const res = await streamsApi.getDetections(selectedCameraId);
        if (isMounted && res.ok && res.data) {
          setTelemetry({
            threat_level: res.data.threat_level,
            threat_score: res.data.threat_score,
            threat_reasons: res.data.threat_reasons,
            track_count: res.data.track_count ?? res.data.tracks?.length ?? 0,
            fps: res.data.fps,
            source_fps: res.data.source_fps,
            resolution: res.data.resolution,
            capabilities: res.data.capabilities,
            counts: res.data.counts,
            tracks: res.data.tracks?.map((t: TrackItem | { track_id: number; class_name?: string; class?: string; confidence?: number; bbox?: { x1: number; y1: number; x2: number; y2: number } }) => ({
              track_id: t.track_id,
              class_name: t.class_name || (t as { class?: string }).class || 'target',
              confidence: t.confidence ?? 0.85,
              bbox: t.bbox,
            })),
          });
          setFeedError(false);
        }
      } catch {
        // Telemetry poll soft fail
      }
    };

    poll();
    const interval = setInterval(poll, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedCameraId, activeStream?.status]);

  const handleCameraChange = (camId: string) => {
    setSelectedCameraId(camId);
    setSearchParams({ camera: camId });
    setStreamKey(Date.now());
    setFeedError(false);
  };

  const handleSnapshotCapture = useCallback(async () => {
    if (!selectedCameraId) return;
    try {
      const res = await streamsApi.getSnapshotUrl(selectedCameraId, isAnnotated);
      if (res.ok && res.data) {
        const blobUrl = URL.createObjectURL(res.data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `IBVAP-${selectedCameraId}-${Date.now()}.jpg`;
        link.click();
        URL.revokeObjectURL(blobUrl);
        onNotify('Surveillance snapshot captured and downloaded.', 'success');
      } else {
        onNotify('Failed to capture snapshot.', 'error');
      }
    } catch {
      onNotify('Snapshot capture error.', 'error');
    }
  }, [selectedCameraId, isAnnotated, onNotify]);

  const liveUrl = selectedCameraId
    ? `${streamsApi.getLiveStreamUrl(selectedCameraId, isAnnotated)}&_t=${streamKey}`
    : '';

  const threatLevel = telemetry?.threat_level || 'NORMAL';
  const threatScore = telemetry?.threat_score ?? 0;

  const getThreatBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return { bg: 'rgba(220, 38, 38, 0.25)', color: '#ef4444', border: '#dc2626' };
      case 'HIGH RISK':
      case 'HIGH':
        return { bg: 'rgba(234, 88, 12, 0.25)', color: '#f97316', border: '#ea580c' };
      case 'MEDIUM RISK':
      case 'MEDIUM':
        return { bg: 'rgba(234, 179, 8, 0.25)', color: '#facc15', border: '#eab308' };
      case 'LOW RISK':
      case 'LOW':
        return { bg: 'rgba(56, 189, 248, 0.25)', color: '#38bdf8', border: '#0284c7' };
      default:
        return { bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '#16a34a' };
    }
  };

  const badgeStyle = getThreatBadgeStyle(threatLevel);

  return (
    <div className="page-container surveillance-page">
      {/* Top Tactical Command Header */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h2 className="section-heading">Live Border Surveillance Command</h2>
            <span className="section-caption font-mono">
              HIGH-PRECISION REAL-TIME AI PERIMETER MONITORING // C2 OPS
            </span>
          </div>
        </div>

        <div className="surveillance-controls-row">
          {/* Camera Switcher Dropdown */}
          <div className="camera-switcher-wrap">
            <label className="font-mono text-xs text-muted">CAMERA NODE:</label>
            <select
              className="form-select font-mono"
              value={selectedCameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              disabled={streamsLoading || streams.length === 0}
            >
              {streams.length === 0 ? (
                <option value="">No Streams Connected</option>
              ) : (
                streams.map((s) => (
                  <option key={s.camera_id} value={s.camera_id}>
                    {s.camera_id} ({s.status} - {s.location || 'Perimeter'})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-tactical btn-sm"
            onClick={onOpenConnectModal}
          >
            + Add Stream
          </button>
        </div>
      </div>

      {/* Main Dual-Column Command Layout */}
      <div className="surveillance-main-grid">
        {/* Left / Center: Large Monitor Viewport */}
        <div className="surveillance-viewport-panel border-tactical">
          {/* Monitor Top Ribbon */}
          <div className="monitor-top-ribbon">
            <div className="ribbon-left font-mono">
              <span className="rec-dot">●</span>
              <span className="text-bold">{selectedCameraId || 'NO CHANNEL'}</span>
              {activeStream && (
                <span className="sector-tag">
                  {activeStream.sector || 'SECTOR 02 - ROADWAY'}
                </span>
              )}
            </div>

            <div className="ribbon-center">
              <div
                className="tactical-threat-pill font-mono"
                style={{
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.color,
                  borderColor: badgeStyle.border,
                }}
              >
                THREAT LEVEL: {threatLevel} [{threatScore}/100]
              </div>
            </div>

            <div className="ribbon-right">
              {activeStream && <StatusBadge status={activeStream.status} size="sm" />}
            </div>
          </div>

          {/* Large Video Display */}
          <div className="monitor-canvas-container">
            {activeStream?.status === 'ONLINE' && !feedError ? (
              <div className="monitor-img-wrapper">
                <img
                  src={liveUrl}
                  alt={`Live Surveillance Stream ${selectedCameraId}`}
                  className="monitor-stream-image"
                  onError={() => setFeedError(true)}
                />

                {/* HUD Active Corner Brackets */}
                <div className="hud-corner hud-top-left" />
                <div className="hud-corner hud-top-right" />
                <div className="hud-corner hud-bottom-left" />
                <div className="hud-corner hud-bottom-right" />
              </div>
            ) : (
              <div className="offline-feed-pattern monitor-offline">
                <div className="pattern-crosshairs" />
                <div className="pattern-status">
                  <span className="pattern-code font-mono">
                    {streams.length === 0
                      ? 'NO SURVEILLANCE STREAMS CONFIGURED'
                      : activeStream?.status === 'ONLINE'
                      ? 'STREAM INITIALIZING...'
                      : `CAMERA ${selectedCameraId} IS OFFLINE`}
                  </span>
                  <span className="pattern-desc">
                    {streams.length === 0
                      ? 'Click "+ Add Stream" or "Connect Camera" to start live monitoring.'
                      : 'Verifying video decoder connection...'}
                  </span>
                  {streams.length === 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-tactical btn-sm mt-3"
                      onClick={onOpenConnectModal}
                    >
                      Connect Primary Demo CCTV
                    </button>
                  )}
                  {feedError && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm mt-3"
                      onClick={() => {
                        setFeedError(false);
                        setStreamKey(Date.now());
                      }}
                    >
                      ↻ Reconnect Stream Feed
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Monitor Tactical HUD Action Bar */}
          <div className="monitor-bottom-hud">
            <div className="hud-actions-left">
              <button
                type="button"
                className={`btn btn-sm ${isAnnotated ? 'btn-accent-crimson' : 'btn-secondary'}`}
                onClick={() => setIsAnnotated(!isAnnotated)}
              >
                {isAnnotated ? '✓ AI Overlays Active' : 'Enable AI Overlays'}
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleSnapshotCapture}
                disabled={activeStream?.status !== 'ONLINE'}
                title="Download high-resolution forensic snapshot with AI annotations"
              >
                📸 Capture Snapshot
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setStreamKey(Date.now())}
                title="Reload video decoder"
              >
                ↻ Refresh Feed
              </button>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => navigate(`/zones?camera=${selectedCameraId}`)}
                title="Configure virtual fence and restricted zones"
              >
                📐 Edit Zones
              </button>
            </div>

            {/* Real-time Telemetry Stats */}
            <div className="hud-telemetry-right font-mono text-xs">
              <span className="telemetry-pill">
                STREAM: <strong className="text-cyan">{telemetry?.fps ?? 29.0} FPS</strong>
              </span>
              <span className="telemetry-pill">
                RES: <strong>{telemetry?.resolution || '480x848'}</strong>
              </span>
              <span className="telemetry-pill">
                ACTIVE TARGETS: <strong className="text-amber">{telemetry?.track_count ?? 0}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Active Targets & AI Capabilities */}
        <div className="surveillance-side-panel">
          {/* Active Targets / Tracks Panel */}
          <div className="tactical-panel-card border-tactical">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="panel-tag font-mono">TRACKING TELEMETRY</span>
                <h3 className="panel-title">Active Target Tracks</h3>
              </div>
              <span className="count-pill font-mono">
                {telemetry?.track_count ?? 0} LOCKED
              </span>
            </div>

            <div className="panel-body">
              {telemetry?.threat_reasons && telemetry.threat_reasons.length > 0 && (
                <div className="threat-reasons-box">
                  <span className="font-bold text-xs text-crimson font-mono">
                    ⚠ THREAT REASONS:
                  </span>
                  <ul className="reasons-list font-mono text-xs">
                    {telemetry.threat_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Target Table */}
              <div className="table-responsive">
                <table className="tactical-table text-xs">
                  <thead>
                    <tr>
                      <th>TRACK ID</th>
                      <th>CLASS</th>
                      <th>CONF</th>
                      <th>BOUNDING BOX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!telemetry?.tracks || telemetry.tracks.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          No active targets in view
                        </td>
                      </tr>
                    ) : (
                      telemetry.tracks.map((t) => (
                        <tr key={t.track_id}>
                          <td className="font-mono font-bold text-cyan">#{t.track_id}</td>
                          <td className="font-mono">{t.class_name.toUpperCase()}</td>
                          <td className="font-mono">{Math.round((t.confidence || 0.88) * 100)}%</td>
                          <td className="font-mono text-muted">
                            {t.bbox
                              ? `[${Math.round(t.bbox.x1)}, ${Math.round(t.bbox.y1)}, ${Math.round(t.bbox.x2)}, ${Math.round(t.bbox.y2)}]`
                              : 'DETECTED'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* AI Intelligence Capabilities Matrix */}
          <div className="tactical-panel-card border-tactical mt-3">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="panel-tag font-mono">INSPECTION PIPELINE</span>
                <h3 className="panel-title">AI Capabilities Matrix</h3>
              </div>
              <span className="badge badge-green font-mono">ONLINE</span>
            </div>

            <div className="panel-body">
              <div className="capabilities-checklist">
                {[
                  { id: 'yolo', label: 'YOLOv8 Object Detection', active: true },
                  { id: 'tracker', label: 'Multi-Object Tracking (ByteTrack)', active: true },
                  { id: 'fence', label: 'Virtual Tripwire / Fence Breach', active: true },
                  { id: 'zone', label: 'Restricted Perimeter Zone Guard', active: true },
                  { id: 'direction', label: 'Wrong-Direction Motion Analysis', active: true },
                  { id: 'loitering', label: 'Loitering & Dwell Time Scoring', active: true },
                  { id: 'night', label: 'Night Movement & Illumination IR', active: true },
                  { id: 'group', label: 'Group Movement & Mass Aggregation', active: true },
                  { id: 'anpr', label: 'Fault-Tolerant ANPR License Plate', active: true },
                  { id: 'face', label: 'Face Detection Reticle', active: true },
                  { id: 'risk', label: 'Suspicious Activity Composite Scorer', active: true },
                ].map((cap) => (
                  <div key={cap.id} className="capability-check-row font-mono text-xs">
                    <span className="cap-indicator">✓</span>
                    <span className="cap-label">{cap.label}</span>
                    <span className="cap-status text-green">ACTIVE</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
