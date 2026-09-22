import React, { useState, useEffect, useRef, useCallback } from 'react';
import { streamsApi, type StreamInfo } from '../api/streamsApi';
import StatusBadge from './StatusBadge';

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

interface TileTelemetry {
  threat_level?: string;
  threat_score?: number;
  threat_reasons?: string[];
  track_count?: number;
  fps?: number;
  resolution?: string;
  tracks?: TrackItem[];
}

interface SurveillanceCameraTileProps {
  stream: StreamInfo;
  isFocused: boolean;
  onFocus?: () => void;
  onSnapshot?: (cameraId: string) => void;
  onEditZones?: (cameraId: string) => void;
  onToggleStatus?: (cameraId: string, currentStatus: string) => void;
}

export default React.memo(function SurveillanceCameraTile({
  stream,
  isFocused,
  onFocus,
  onSnapshot,
  onEditZones,
  onToggleStatus,
}: SurveillanceCameraTileProps) {
  const [feedError, setFeedError] = useState<boolean>(false);
  const [streamKey, setStreamKey] = useState<number>(Date.now());
  const [isAnnotated, setIsAnnotated] = useState<boolean>(true);
  const [telemetry, setTelemetry] = useState<TileTelemetry | null>(null);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isOnline = stream.status?.toUpperCase() === 'ONLINE';

  // Independent telemetry polling for this camera
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
            fps: res.data.fps,
            resolution: res.data.resolution,
            tracks: res.data.tracks?.map((t: TrackItem) => ({
              track_id: t.track_id,
              class_name: t.class_name || 'target',
              confidence: t.confidence ?? 0.85,
              bbox: t.bbox,
            })),
          });
          setFeedError(false);
        }
      } catch {
        // Soft fail
      }
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, isFocused ? 1200 : 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [stream.camera_id, isOnline, isFocused]);

  // Snapshot polling mode fallback if user disables live MJPEG to save bandwidth
  useEffect(() => {
    if (!isOnline || isLiveActive) {
      if (snapshotUrl) {
        URL.revokeObjectURL(snapshotUrl);
        setSnapshotUrl(null);
      }
      return;
    }

    let isMounted = true;
    const fetchSnapshot = async () => {
      try {
        const res = await streamsApi.getSnapshotUrl(stream.camera_id, isAnnotated);
        if (isMounted && res.ok && res.data) {
          const url = URL.createObjectURL(res.data);
          setSnapshotUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setFeedError(false);
        }
      } catch {
        // Soft fail
      }
    };

    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOnline, isLiveActive, stream.camera_id, isAnnotated]);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleReconnect = useCallback(() => {
    setFeedError(false);
    setStreamKey(Date.now());
  }, []);

  const liveUrl = `${streamsApi.getLiveStreamUrl(stream.camera_id, isAnnotated)}&_t=${streamKey}`;
  const threatLevel = telemetry?.threat_level || 'NORMAL';
  const threatScore = telemetry?.threat_score ?? 0;

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#D9534F';
      case 'HIGH':
      case 'HIGH RISK':
        return '#C76B3C';
      case 'MEDIUM':
      case 'MEDIUM RISK':
        return '#D6A64A';
      default:
        return '#6E9B7B';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`surveillance-tile ${isFocused ? 'tile-focused' : ''} ${!isOnline ? 'tile-offline' : ''}`}
    >
      {/* Top Tile Ribbon */}
      <div className="tile-ribbon">
        <div className="tile-ribbon-left font-mono">
          <span className={`tile-beacon ${isOnline ? 'active' : 'inactive'}`} />
          <strong className="tile-id">{stream.camera_id}</strong>
          <span className="tile-name text-muted">{stream.location || 'Perimeter'}</span>
          <span className="tile-sector">{stream.sector || 'SEC-01'}</span>
        </div>

        <div className="tile-ribbon-right">
          {telemetry?.threat_level && (
            <span
              className="tile-threat-badge font-mono"
              style={{
                borderColor: getThreatColor(threatLevel),
                color: getThreatColor(threatLevel),
              }}
            >
              {threatLevel} [{threatScore}]
            </span>
          )}
          <StatusBadge status={stream.status} size="sm" />
        </div>
      </div>

      {/* Video Stream Stage */}
      <div className="tile-stage">
        {isOnline && !feedError ? (
          <div className="tile-video-wrapper">
            {isLiveActive ? (
              <img
                src={liveUrl}
                alt={`Live Feed ${stream.camera_id}`}
                className="tile-stream-img"
                onError={() => setFeedError(true)}
              />
            ) : snapshotUrl ? (
              <img
                src={snapshotUrl}
                alt={`Snapshot Feed ${stream.camera_id}`}
                className="tile-stream-img"
              />
            ) : (
              <div className="tile-loading font-mono">Loading frame...</div>
            )}

            {/* Tactical HUD Corner Reticles */}
            <div className="hud-corner hud-top-left" />
            <div className="hud-corner hud-top-right" />
            <div className="hud-corner hud-bottom-left" />
            <div className="hud-corner hud-bottom-right" />

            {/* In-Frame Live Overlay Badges */}
            <div className="tile-overlay-top font-mono">
              <span className="overlay-pill live-pill">
                ● {isLiveActive ? 'LIVE STREAM' : 'SNAPSHOT MODE'}
              </span>
              {telemetry?.fps && (
                <span className="overlay-pill fps-pill">{telemetry.fps.toFixed(1)} FPS</span>
              )}
              {telemetry?.resolution && (
                <span className="overlay-pill res-pill">{telemetry.resolution}</span>
              )}
            </div>

            {/* Targets count overlay */}
            <div className="tile-overlay-bottom font-mono">
              <span className="overlay-pill target-pill">
                TARGETS: {telemetry?.track_count ?? 0}
              </span>
            </div>
          </div>
        ) : (
          <div className="tile-offline-state font-mono">
            <div className="offline-grid-lines" />
            <div className="offline-message">
              <span className="offline-glyph">⌧</span>
              <span className="offline-title">
                {stream.status === 'ONLINE' ? 'STREAM CONNECTION FAILED' : 'NODE OFFLINE'}
              </span>
              <span className="offline-subtitle text-muted">
                {stream.status === 'ONLINE'
                  ? 'Video stream decoder did not respond. Check backend ingestion.'
                  : 'Ingestion worker stopped. Re-engage node to start monitoring.'}
              </span>
              <div className="offline-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleReconnect}
                >
                  ↻ Reconnect Feed
                </button>
                {onToggleStatus && (
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => onToggleStatus(stream.camera_id, stream.status)}
                  >
                    {stream.status === 'ONLINE' ? 'Stop Stream' : 'Start Stream'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tile Controls & Telemetry */}
      <div className="tile-toolbar">
        <div className="tile-toolbar-actions">
          {onFocus && (
            <button
              type="button"
              className={`btn btn-xs ${isFocused ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onFocus}
              title={isFocused ? 'Exit Focus View' : 'Maximize this camera tile'}
            >
              {isFocused ? 'Exit Focus' : '⛶ Focus'}
            </button>
          )}

          <button
            type="button"
            className="btn btn-xs btn-secondary"
            onClick={() => setIsLiveActive((prev) => !prev)}
            title="Toggle between Live MJPEG stream and 1.5s Snapshot Mode"
          >
            {isLiveActive ? '⚡ Live' : '⏱ Snapshot'}
          </button>

          <button
            type="button"
            className={`btn btn-xs ${isAnnotated ? 'btn-secondary active' : 'btn-secondary'}`}
            onClick={() => setIsAnnotated((prev) => !prev)}
            title="Toggle AI bounding box & tracker overlays"
          >
            {isAnnotated ? 'AI ON' : 'AI OFF'}
          </button>

          {onSnapshot && (
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              onClick={() => onSnapshot(stream.camera_id)}
              disabled={!isOnline}
              title="Download forensic frame"
            >
              📸 Snapshot
            </button>
          )}

          {onEditZones && (
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              onClick={() => onEditZones(stream.camera_id)}
              title="Configure Perimeter Zones for this camera"
            >
              📐 Zones
            </button>
          )}

          <button
            type="button"
            className="btn btn-xs btn-secondary"
            onClick={handleFullscreen}
            title="Full Screen View"
          >
            ⛶ Fullscreen
          </button>
        </div>

        <div className="tile-quick-health font-mono text-xs">
          {onToggleStatus && (
            <button
              type="button"
              className={`btn-stream-power ${isOnline ? 'stop' : 'start'}`}
              onClick={() => onToggleStatus(stream.camera_id, stream.status)}
              title={isOnline ? 'Halt ingestion worker' : 'Start ingestion worker'}
            >
              {isOnline ? '⏹ STOP' : '▶ START'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
