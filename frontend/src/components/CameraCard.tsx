import { useState, useEffect, useCallback } from 'react';
import { streamsApi, type StreamInfo } from '../api/streamsApi';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

interface CameraCardProps {
  stream: StreamInfo;
  onDisconnected?: (cameraId: string) => void;
  onError?: (err: string) => void;
}

interface StreamTelemetry {
  threat_level?: string;
  threat_score?: number;
  threat_reasons?: string[];
  track_count?: number;
  detections_count?: number;
  tracks?: Array<{
    track_id: number;
    class_name: string;
    confidence: number;
  }>;
}

export default function CameraCard({
  stream,
  onDisconnected,
  onError,
}: CameraCardProps) {
  const navigate = useNavigate();
  const [isAnnotated, setIsAnnotated] = useState<boolean>(true);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<StreamTelemetry | null>(null);
  const [streamKey, setStreamKey] = useState<number>(Date.now());

  const isOnline = stream.status === 'ONLINE';

  // Poll detections telemetry when stream is ONLINE
  useEffect(() => {
    if (!isOnline) {
      setTelemetry(null);
      return;
    }

    let isMounted = true;

    const pollTelemetry = async () => {
      try {
        const res = await streamsApi.getDetections(stream.camera_id);
        if (isMounted && res.ok && res.data) {
          setTelemetry({
            threat_level: res.data.threat_level,
            threat_score: res.data.threat_score,
            threat_reasons: res.data.threat_reasons,
            track_count: res.data.track_count ?? res.data.tracks?.length ?? 0,
            detections_count: res.data.detections_count ?? res.data.detections?.length ?? 0,
            tracks: res.data.tracks,
          });
          setStreamError(false);
        }
      } catch {
        // Soft fail for telemetry polling
      }
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stream.camera_id, isOnline]);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm(`Disconnect camera stream "${stream.camera_id}"?`)) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await streamsApi.disconnectStream(stream.camera_id);
      if (res.ok) {
        onDisconnected?.(stream.camera_id);
      } else {
        onError?.(res.error);
      }
    } catch {
      onError?.(`Failed to disconnect ${stream.camera_id}`);
    } finally {
      setIsDisconnecting(false);
    }
  }, [stream.camera_id, onDisconnected, onError]);

  const liveUrl = `${streamsApi.getLiveStreamUrl(stream.camera_id, isAnnotated)}&_t=${streamKey}`;

  const threatLevel = telemetry?.threat_level || 'NORMAL';
  const threatScore = telemetry?.threat_score ?? 0;

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#dc2626';
      case 'HIGH RISK':
      case 'HIGH':
        return '#ea580c';
      case 'MEDIUM RISK':
      case 'MEDIUM':
        return '#eab308';
      case 'LOW RISK':
      case 'LOW':
        return '#38bdf8';
      default:
        return '#22c55e';
    }
  };

  return (
    <div className={`camera-card status-${stream.status.toLowerCase()} border-tactical`}>
      {/* Card Header */}
      <div className="camera-card-header">
        <div className="camera-id-block">
          <span className="camera-icon">📹</span>
          <div>
            <h3 className="camera-id font-mono">{stream.camera_id}</h3>
            <span className="camera-sector font-mono">
              {stream.sector ? `SECTOR: ${stream.sector}` : 'SECTOR: UNASSIGNED'}
            </span>
          </div>
        </div>

        <div className="camera-badges">
          {telemetry && (
            <span
              className="threat-badge font-mono"
              style={{
                backgroundColor: `${getThreatColor(threatLevel)}22`,
                color: getThreatColor(threatLevel),
                borderColor: `${getThreatColor(threatLevel)}66`,
              }}
              title={telemetry.threat_reasons?.join(', ') || threatLevel}
            >
              ⚠ {threatLevel} ({threatScore})
            </span>
          )}
          <span className="source-pill font-mono">{stream.source_type}</span>
          <StatusBadge status={stream.status} size="sm" />
        </div>
      </div>

      {/* Snapshot / Video Monitor Viewport */}
      <div className="camera-viewport">
        {isOnline && !streamError ? (
          <div className="snapshot-wrapper">
            <img
              src={liveUrl}
              alt={`Live video stream from ${stream.camera_id}`}
              className="snapshot-image live-stream-feed"
              onError={() => {
                setStreamError(true);
              }}
            />

            {/* Tactical Live Stream HUD Overlay */}
            <div className="viewport-overlay">
              <div className="overlay-left">
                <span className="overlay-live">● LIVE FEED</span>
                {isAnnotated && (
                  <span className="overlay-hud-tag font-mono">AI HUD ON</span>
                )}
              </div>
              <div className="overlay-right font-mono">
                {telemetry && (
                  <span className="overlay-tracks">
                    TRACKS: {telemetry.track_count}
                  </span>
                )}
                <span className="overlay-res">
                  {stream.health?.resolution && stream.health.resolution !== '0x0'
                    ? stream.health.resolution
                    : '480x848'}
                </span>
              </div>
            </div>

            {/* Quick Stream Controls on Hover */}
            <div className="viewport-quick-actions">
              <button
                type="button"
                className={`btn btn-xs ${isAnnotated ? 'btn-danger-subtle' : 'btn-secondary'}`}
                onClick={() => setIsAnnotated(!isAnnotated)}
                title="Toggle tactical AI detection overlay"
              >
                {isAnnotated ? 'Hide AI Overlay' : 'Show AI Overlay'}
              </button>
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => setStreamKey(Date.now())}
                title="Refresh stream feed"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        ) : (
          <div className="offline-feed-pattern">
            <div className="pattern-crosshairs" />
            <div className="pattern-status">
              <span className="pattern-code font-mono">
                {stream.status === 'ONLINE' ? 'INITIALIZING AI FEED' : 'OFFLINE'}
              </span>
              <span className="pattern-desc">
                {stream.status === 'ONLINE'
                  ? 'Connecting to live OpenCV worker...'
                  : stream.health?.last_error
                  ? stream.health.last_error
                  : `Stream state: ${stream.status}`}
              </span>
              {stream.status === 'ONLINE' && streamError && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline-danger mt-2"
                  onClick={() => {
                    setStreamError(false);
                    setStreamKey(Date.now());
                  }}
                >
                  Retry Feed Connection
                </button>
              )}
            </div>
            <div className="pattern-bars">
              <span className="bar c1" />
              <span className="bar c2" />
              <span className="bar c3" />
              <span className="bar c4" />
              <span className="bar c5" />
            </div>
          </div>
        )}

        {/* Tactical HUD Corner Elements */}
        <div className="hud-corner hud-top-left" />
        <div className="hud-corner hud-top-right" />
        <div className="hud-corner hud-bottom-left" />
        <div className="hud-corner hud-bottom-right" />
      </div>

      {/* Camera Location & Telemetry */}
      <div className="camera-info">
        <div className="location-row">
          <span className="location-label">LOCATION:</span>
          <span className="location-value" title={stream.location || 'Not specified'}>
            {stream.location || 'Border Perimeter Station'}
          </span>
        </div>

        <div className="telemetry-grid">
          <div className="telemetry-cell">
            <span className="cell-label">STREAM FPS</span>
            <span className="cell-value font-mono">
              {stream.health?.fps?.toFixed(1) ?? '25.0'}
              <span className="cell-unit">/{stream.health?.source_fps?.toFixed(0) ?? '29'}</span>
            </span>
          </div>

          <div className="telemetry-cell">
            <span className="cell-label">AI TRACKS</span>
            <span className="cell-value font-mono">
              {telemetry?.track_count ?? 0}
              <span className="cell-unit"> active</span>
            </span>
          </div>

          <div className="telemetry-cell">
            <span className="cell-label">THREAT SCORE</span>
            <span className="cell-value font-mono" style={{ color: getThreatColor(threatLevel) }}>
              {threatScore}
              <span className="cell-unit">/100</span>
            </span>
          </div>

          <div className="telemetry-cell">
            <span className="cell-label">DROPPED</span>
            <span className="cell-value font-mono">
              {stream.health?.dropped_frames ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="camera-card-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/surveillance?camera=${stream.camera_id}`)}
          title="Open large monitor in tactical surveillance command room"
        >
          🔍 Full Monitor
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/zones?camera=${stream.camera_id}`)}
          title="Configure virtual fence and restricted zones"
        >
          📐 Zones
        </button>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    </div>
  );
}
