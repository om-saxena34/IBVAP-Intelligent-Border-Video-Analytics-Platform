import { useState } from 'react';
import type { StreamInfo } from '../api/streamsApi';
import CameraCard from './CameraCard';
import { EmptyState } from './States';

interface CameraGridProps {
  streams: StreamInfo[];
  loading?: boolean;
  onOpenConnectModal: () => void;
  onCameraDisconnected?: (cameraId: string) => void;
  onError?: (err: string) => void;
  showFilters?: boolean;
}

export default function CameraGrid({
  streams,
  loading,
  onOpenConnectModal,
  onCameraDisconnected,
  onError,
  showFilters = true,
}: CameraGridProps) {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  if (loading && streams.length === 0) {
    return (
      <div className="camera-grid-loading">
        <div className="radar-spinner" />
        <p className="loading-label">Scanning video network channels...</p>
      </div>
    );
  }

  // Handle empty state explicitly
  if (streams.length === 0) {
    return (
      <div className="camera-grid-empty">
        <EmptyState
          title="No Camera Streams"
          message="No registered surveillance feeds connected to IBVAP platform."
          detail="Connect a CCTV (RTSP stream), integrated webcam, or offline video file to begin real-time surveillance."
          icon="📹"
          action={
            <button
              type="button"
              className="btn btn-primary btn-tactical"
              onClick={onOpenConnectModal}
            >
              + Connect Camera
            </button>
          }
        />
      </div>
    );
  }

  // Filter streams
  const filteredStreams = streams.filter((stream) => {
    if (filterType !== 'ALL' && stream.source_type !== filterType) {
      return false;
    }
    if (filterStatus !== 'ALL' && stream.status !== filterStatus) {
      return false;
    }
    return true;
  });

  return (
    <div className="camera-grid-container">
      {showFilters && (
        <div className="camera-grid-toolbar">
          <div className="filter-group">
            <span className="filter-label">SOURCE:</span>
            <button
              type="button"
              className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              ALL ({streams.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === 'RTSP' ? 'active' : ''}`}
              onClick={() => setFilterType('RTSP')}
            >
              RTSP
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === 'WEBCAM' ? 'active' : ''}`}
              onClick={() => setFilterType('WEBCAM')}
            >
              WEBCAM
            </button>
            <button
              type="button"
              className={`filter-btn ${filterType === 'FILE' ? 'active' : ''}`}
              onClick={() => setFilterType('FILE')}
            >
              FILE
            </button>
          </div>

          <div className="filter-group">
            <span className="filter-label">STATUS:</span>
            <button
              type="button"
              className={`filter-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterStatus('ALL')}
            >
              ALL
            </button>
            <button
              type="button"
              className={`filter-btn ${filterStatus === 'ONLINE' ? 'active' : ''}`}
              onClick={() => setFilterStatus('ONLINE')}
            >
              ONLINE
            </button>
            <button
              type="button"
              className={`filter-btn ${filterStatus === 'OFFLINE' ? 'active' : ''}`}
              onClick={() => setFilterStatus('OFFLINE')}
            >
              OFFLINE
            </button>
          </div>
        </div>
      )}

      {filteredStreams.length === 0 ? (
        <div className="no-filter-match">
          <p>No camera feeds match the active filter criteria.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setFilterType('ALL');
              setFilterStatus('ALL');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="camera-grid">
          {filteredStreams.map((stream) => (
            <CameraCard
              key={stream.camera_id}
              stream={stream}
              onDisconnected={onCameraDisconnected}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  );
}
