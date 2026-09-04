import { useState, useEffect, useCallback, useRef } from 'react';
import { streamsApi, type StreamInfo } from '../api/streamsApi';
import StatusBadge from './StatusBadge';

interface CameraCardProps {
  stream: StreamInfo;
  onDisconnected?: (cameraId: string) => void;
  onError?: (err: string) => void;
}

export default function CameraCard({
  stream,
  onDisconnected,
  onError,
}: CameraCardProps) {
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);

  // Keep reference to active Blob URL so it can be revoked to prevent memory leaks
  const activeBlobUrlRef = useRef<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    if (stream.status !== 'ONLINE') {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
      setSnapshotUrl(null);
      return;
    }

    try {
      const res = await streamsApi.getSnapshotUrl(stream.camera_id);
      if (res.ok && res.data) {
        const newUrl = URL.createObjectURL(res.data);
        // Revoke previously held Blob URL before updating
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
        }
        activeBlobUrlRef.current = newUrl;
        setSnapshotUrl(newUrl);
        setSnapshotError(false);
      } else {
        setSnapshotError(true);
      }
    } catch {
      setSnapshotError(true);
    }
  }, [stream.camera_id, stream.status]);

  // Snapshot polling interval (every 2.5s for active online streams)
  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 2500);

    return () => {
      clearInterval(interval);
    };
  }, [fetchSnapshot]);

  // Revoke Blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm(`Disconnect camera stream "${stream.camera_id}"?`)) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await streamsApi.disconnectStream(stream.camera_id);
      if (res.ok) {
        if (activeBlobUrlRef.current) {
          URL.revokeObjectURL(activeBlobUrlRef.current);
          activeBlobUrlRef.current = null;
        }
        setSnapshotUrl(null);
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

  const hasLiveFrame = stream.status === 'ONLINE' && snapshotUrl && !snapshotError;

  return (
    <div className={`camera-card status-${stream.status.toLowerCase()}`}>
      {/* Card Header */}
      <div className="camera-card-header">
        <div className="camera-id-block">
          <span className="camera-icon">🎥</span>
          <div>
            <h3 className="camera-id">{stream.camera_id}</h3>
            <span className="camera-sector">
              {stream.sector ? `SECTOR: ${stream.sector}` : 'SECTOR: UNASSIGNED'}
            </span>
          </div>
        </div>

        <div className="camera-badges">
          <span className="source-pill">{stream.source_type}</span>
          <StatusBadge status={stream.status} size="sm" />
        </div>
      </div>

      {/* Snapshot / Video Monitor Viewport */}
      <div className="camera-viewport">
        {hasLiveFrame ? (
          <div className="snapshot-wrapper">
            <img
              src={snapshotUrl}
              alt={`Live video snapshot from ${stream.camera_id}`}
              className="snapshot-image"
              onError={() => setSnapshotError(true)}
            />
            <div className="viewport-overlay">
              <span className="overlay-live">● REC LIVE</span>
              <span className="overlay-res font-mono">
                {stream.health?.resolution && stream.health.resolution !== '0x0'
                  ? stream.health.resolution
                  : 'ACTIVE FEED'}
              </span>
            </div>
          </div>
        ) : (
          <div className="offline-feed-pattern">
            <div className="pattern-crosshairs" />
            <div className="pattern-status">
              <span className="pattern-code">Video Feed Unavailable</span>
              <span className="pattern-desc">
                {stream.status === 'ONLINE'
                  ? 'Acquiring decoded frame...'
                  : stream.health?.last_error
                  ? stream.health.last_error
                  : `Stream ${stream.status}`}
              </span>
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
            <span className="cell-label">FPS</span>
            <span className="cell-value font-mono">
              {stream.health?.fps?.toFixed(1) ?? '0.0'}
              <span className="cell-unit">/{stream.health?.source_fps?.toFixed(0) ?? '0'}</span>
            </span>
          </div>

          <div className="telemetry-cell">
            <span className="cell-label">RESOLUTION</span>
            <span className="cell-value font-mono">
              {stream.health?.resolution && stream.health.resolution !== '0x0'
                ? stream.health.resolution
                : 'N/A'}
            </span>
          </div>

          <div className="telemetry-cell">
            <span className="cell-label">DROPPED</span>
            <span className="cell-value font-mono">
              {stream.health?.dropped_frames ?? 0}
            </span>
          </div>

          <div className="telemetry-cell">
            <span className="cell-label">RECONNECTS</span>
            <span className="cell-value font-mono">
              {stream.health?.reconnect_count ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="camera-card-actions">
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
