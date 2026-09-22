import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStreams } from '../hooks/useStreams';
import { streamsApi } from '../api/streamsApi';
import SurveillanceCameraTile from '../components/SurveillanceCameraTile';

type LayoutMode = '1x1' | '1x2' | '2x2' | '3x2';

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
  const { streams, loading: streamsLoading, refresh: refreshStreams } = useStreams(5000);

  // Layout mode: default to 2x2 if multiple streams, or 1x1
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('2x2');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [focusedCameraId, setFocusedCameraId] = useState<string | null>(null);

  // Pick initial camera from query param or first stream
  const cameraQuery = searchParams.get('camera');

  useEffect(() => {
    if (cameraQuery) {
      setFocusedCameraId(cameraQuery);
      setLayoutMode('1x1');
    } else if (streams.length > 0 && !focusedCameraId) {
      setFocusedCameraId(streams[0].camera_id);
    }
  }, [cameraQuery, streams, focusedCameraId]);

  // Distinct sectors available
  const availableSectors = useMemo(() => {
    const sectors = new Set<string>();
    streams.forEach((s) => {
      if (s.sector) sectors.add(s.sector);
    });
    return Array.from(sectors);
  }, [streams]);

  // Filtered streams list
  const filteredStreams = useMemo(() => {
    return streams.filter((s) => {
      const matchSector = selectedSector === 'ALL' || s.sector === selectedSector;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ONLINE' && s.status?.toUpperCase() === 'ONLINE') ||
        (statusFilter === 'OFFLINE' && s.status?.toUpperCase() !== 'ONLINE');
      return matchSector && matchStatus;
    });
  }, [streams, selectedSector, statusFilter]);

  // Limit streams based on layout mode when in grid
  const visibleStreams = useMemo(() => {
    if (layoutMode === '1x1') {
      const single = streams.find((s) => s.camera_id === focusedCameraId) || streams[0];
      return single ? [single] : [];
    }
    if (layoutMode === '1x2') {
      return filteredStreams.slice(0, 2);
    }
    if (layoutMode === '2x2') {
      return filteredStreams.slice(0, 4);
    }
    if (layoutMode === '3x2') {
      return filteredStreams.slice(0, 6);
    }
    return filteredStreams;
  }, [layoutMode, streams, focusedCameraId, filteredStreams]);

  // Individual toggle start / stop stream
  const handleToggleStatus = useCallback(
    async (cameraId: string, currentStatus: string) => {
      const isCurrentlyOnline = currentStatus?.toUpperCase() === 'ONLINE';
      try {
        if (isCurrentlyOnline) {
          const res = await streamsApi.stop(cameraId);
          if (res.ok) {
            onNotify(`Camera ${cameraId} stream stopped.`, 'success');
            refreshStreams();
          } else {
            onNotify(`Failed to stop camera ${cameraId}.`, 'error');
          }
        } else {
          const res = await streamsApi.start(cameraId);
          if (res.ok) {
            onNotify(`Camera ${cameraId} ingestion worker started.`, 'success');
            refreshStreams();
          } else {
            onNotify(`Failed to start camera ${cameraId}.`, 'error');
          }
        }
      } catch {
        onNotify(`Error toggling camera ${cameraId}.`, 'error');
      }
    },
    [onNotify, refreshStreams]
  );

  // Bulk start all
  const handleStartAll = useCallback(async () => {
    const offlineStreams = streams.filter((s) => s.status?.toUpperCase() !== 'ONLINE');
    if (offlineStreams.length === 0) {
      onNotify('All surveillance streams are already active.', 'success');
      return;
    }
    onNotify(`Initiating ingestion workers for ${offlineStreams.length} nodes...`, 'success');
    for (const s of offlineStreams) {
      try {
        await streamsApi.start(s.camera_id);
      } catch {
        // Continue others
      }
    }
    setTimeout(refreshStreams, 1000);
  }, [streams, onNotify, refreshStreams]);

  // Bulk stop all
  const handleStopAll = useCallback(async () => {
    const onlineStreams = streams.filter((s) => s.status?.toUpperCase() === 'ONLINE');
    if (onlineStreams.length === 0) {
      onNotify('No active streams to stop.', 'success');
      return;
    }
    onNotify(`Halting ingestion workers for ${onlineStreams.length} nodes...`, 'success');
    for (const s of onlineStreams) {
      try {
        await streamsApi.stop(s.camera_id);
      } catch {
        // Continue others
      }
    }
    setTimeout(refreshStreams, 1000);
  }, [streams, onNotify, refreshStreams]);

  // Forensic Snapshot download
  const handleSnapshotCapture = useCallback(
    async (cameraId: string) => {
      try {
        const res = await streamsApi.getSnapshotUrl(cameraId, true);
        if (res.ok && res.data) {
          const blobUrl = URL.createObjectURL(res.data);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `IBVAP-${cameraId}-${Date.now()}.jpg`;
          link.click();
          URL.revokeObjectURL(blobUrl);
          onNotify(`Snapshot saved for camera ${cameraId}.`, 'success');
        } else {
          onNotify(`Failed to capture snapshot for ${cameraId}.`, 'error');
        }
      } catch {
        onNotify(`Snapshot capture error for ${cameraId}.`, 'error');
      }
    },
    [onNotify]
  );

  const handleFocus = useCallback(
    (cameraId: string) => {
      if (layoutMode === '1x1' && focusedCameraId === cameraId) {
        // If already in 1x1, go back to 2x2 grid
        setLayoutMode('2x2');
      } else {
        setFocusedCameraId(cameraId);
        setLayoutMode('1x1');
        setSearchParams({ camera: cameraId });
      }
    },
    [layoutMode, focusedCameraId, setSearchParams]
  );

  const handleEditZones = useCallback(
    (cameraId: string) => {
      navigate(`/zones?camera=${cameraId}`);
    },
    [navigate]
  );

  const onlineCount = streams.filter((s) => s.status?.toUpperCase() === 'ONLINE').length;

  return (
    <div className="page-container surveillance-page-forge">
      {/* Top Operations Tactical Command Bar */}
      <div className="surveillance-top-bar">
        <div className="surveillance-title-block">
          <div className="title-lead font-mono">LIVE TACTICAL C2</div>
          <h2 className="surveillance-heading font-display">Multi-Node Perimeter Surveillance</h2>
          <div className="surveillance-sub font-mono">
            <span>{onlineCount} OF {streams.length} NODES STREAMING</span>
            <span className="dot-sep">•</span>
            <span>ZERO-LATENCY MJPEG DECODER</span>
          </div>
        </div>

        {/* Tactical Actions Toolbar */}
        <div className="surveillance-actions-cluster">
          {/* Layout Mode Switcher */}
          <div className="layout-selector font-mono" role="group" aria-label="Layout Grid Mode">
            <button
              type="button"
              className={`layout-btn ${layoutMode === '1x1' ? 'active' : ''}`}
              onClick={() => setLayoutMode('1x1')}
              title="1x1 Single Focus View"
            >
              1×1
            </button>
            <button
              type="button"
              className={`layout-btn ${layoutMode === '1x2' ? 'active' : ''}`}
              onClick={() => setLayoutMode('1x2')}
              title="1x2 Split Screen"
            >
              1×2
            </button>
            <button
              type="button"
              className={`layout-btn ${layoutMode === '2x2' ? 'active' : ''}`}
              onClick={() => setLayoutMode('2x2')}
              title="2x2 Quad Grid"
            >
              2×2
            </button>
            <button
              type="button"
              className={`layout-btn ${layoutMode === '3x2' ? 'active' : ''}`}
              onClick={() => setLayoutMode('3x2')}
              title="3x2 Six-Up Grid"
            >
              3×2
            </button>
          </div>

          {/* Sector Filter */}
          {availableSectors.length > 0 && (
            <select
              className="forge-select font-mono"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              title="Filter by Sector"
            >
              <option value="ALL">ALL SECTORS</option>
              {availableSectors.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            className="forge-select font-mono"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ONLINE' | 'OFFLINE')}
            title="Filter by Status"
          >
            <option value="ALL">STATUS: ALL</option>
            <option value="ONLINE">ONLINE ONLY</option>
            <option value="OFFLINE">OFFLINE ONLY</option>
          </select>

          {/* Start / Stop All Bulk Buttons */}
          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={handleStartAll}
            title="Start all offline cameras"
          >
            ▶ Start All
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={handleStopAll}
            title="Halt all streaming cameras"
          >
            ⏹ Stop All
          </button>

          {/* Connect / Upload Camera */}
          <button
            type="button"
            className="btn btn-primary btn-sm btn-forge-action font-mono"
            onClick={onOpenConnectModal}
            title="Deploy new camera or upload CCTV footage"
          >
            + Deploy Stream
          </button>
        </div>
      </div>

      {/* Main Grid Viewport Canvas */}
      <div className="surveillance-canvas-area">
        {streamsLoading && streams.length === 0 ? (
          <div className="surveillance-empty-state font-mono">
            <span className="empty-spinner">↻</span>
            <span>DISCOVERING PERIMETER CAMERA NODES...</span>
          </div>
        ) : streams.length === 0 ? (
          <div className="surveillance-empty-state font-mono">
            <span className="empty-glyph">⌧</span>
            <h3>NO CAMERA STREAMS CONFIGURED</h3>
            <p className="text-muted">
              Connect a live CCTV stream, RTSP camera, or select an official surveillance preset to begin monitoring.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-forge-deploy mt-3"
              onClick={onOpenConnectModal}
            >
              Connect Surveillance Node
            </button>
          </div>
        ) : visibleStreams.length === 0 ? (
          <div className="surveillance-empty-state font-mono">
            <span>NO NODES MATCH CURRENT SECTOR OR STATUS FILTER</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-3"
              onClick={() => {
                setSelectedSector('ALL');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className={`surveillance-grid-container grid-layout-${layoutMode}`}>
            {visibleStreams.map((stream) => (
              <SurveillanceCameraTile
                key={stream.camera_id}
                stream={stream}
                isFocused={layoutMode === '1x1' && stream.camera_id === focusedCameraId}
                onFocus={() => handleFocus(stream.camera_id)}
                onSnapshot={handleSnapshotCapture}
                onEditZones={handleEditZones}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
