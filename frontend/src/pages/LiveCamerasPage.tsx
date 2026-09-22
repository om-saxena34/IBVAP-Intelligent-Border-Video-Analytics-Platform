import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStreams } from '../hooks/useStreams';
import { useHealth } from '../hooks/useHealth';
import { streamsApi } from '../api/streamsApi';
import StatusBadge from '../components/StatusBadge';
import CameraGrid from '../components/CameraGrid';

interface LiveCamerasPageProps {
  onOpenConnectModal: () => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

type ViewMode = 'table' | 'grid';
type SortField = 'id' | 'status' | 'fps' | 'sector';

export default function LiveCamerasPage({
  onOpenConnectModal,
  onNotify,
}: LiveCamerasPageProps) {
  const navigate = useNavigate();
  const { streams, loading, error, refresh: refreshStreams } = useStreams(4000);
  const { refresh: refreshHealth } = useHealth(8000);

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Toggle camera stream
  const handleToggleStream = useCallback(
    async (cameraId: string, currentStatus: string) => {
      const isOnline = currentStatus?.toUpperCase() === 'ONLINE';
      try {
        if (isOnline) {
          const res = await streamsApi.stop(cameraId);
          if (res.ok) {
            onNotify(`Camera ${cameraId} stream halted.`, 'success');
            refreshStreams();
            refreshHealth();
          } else {
            onNotify(`Failed to stop camera ${cameraId}.`, 'error');
          }
        } else {
          const res = await streamsApi.start(cameraId);
          if (res.ok) {
            onNotify(`Camera ${cameraId} ingestion worker activated.`, 'success');
            refreshStreams();
            refreshHealth();
          } else {
            onNotify(`Failed to start camera ${cameraId}.`, 'error');
          }
        }
      } catch {
        onNotify(`Error communicating with node ${cameraId}.`, 'error');
      }
    },
    [onNotify, refreshStreams, refreshHealth]
  );

  // Disconnect / Delete stream
  const handleDisconnect = useCallback(
    async (cameraId: string) => {
      if (!window.confirm(`Disconnect camera node "${cameraId}" and release resources?`)) {
        return;
      }
      try {
        const res = await streamsApi.disconnect(cameraId);
        if (res.ok) {
          onNotify(`Camera node ${cameraId} decommissioned.`, 'success');
          refreshStreams();
          refreshHealth();
        } else {
          onNotify(`Failed to disconnect camera ${cameraId}.`, 'error');
        }
      } catch {
        onNotify(`Error disconnecting camera ${cameraId}.`, 'error');
      }
    },
    [onNotify, refreshStreams, refreshHealth]
  );

  // Filtered & sorted streams
  const processedStreams = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = streams.filter((s) => {
      const matchSearch =
        s.camera_id.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        (s.sector && s.sector.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ONLINE' && s.status?.toUpperCase() === 'ONLINE') ||
        (statusFilter === 'OFFLINE' && s.status?.toUpperCase() !== 'ONLINE');

      return matchSearch && matchStatus;
    });

    return filtered.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'id') {
        valA = a.camera_id;
        valB = b.camera_id;
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (sortField === 'fps') {
        valA = a.health?.fps ?? 0;
        valB = b.health?.fps ?? 0;
      } else if (sortField === 'sector') {
        valA = a.sector || '';
        valB = b.sector || '';
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [streams, searchQuery, statusFilter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const onlineCount = streams.filter((s) => s.status?.toUpperCase() === 'ONLINE').length;

  return (
    <div className="page-container camera-fleet-page">
      {/* Header Bar */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h2 className="section-heading font-display">Perimeter Camera Fleet Registry</h2>
            <span className="section-caption font-mono">
              ACTIVE SENSING NODES // INGESTION WORKERS & STREAM PROTOCOLS
            </span>
          </div>
        </div>

        <div className="header-action-buttons font-mono">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              refreshStreams();
              refreshHealth();
            }}
          >
            ↻ Sync Fleet
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-forge-deploy"
            onClick={onOpenConnectModal}
          >
            + Deploy Camera Node
          </button>
        </div>
      </div>

      {/* Fleet Filter & Search Bar */}
      <div className="fleet-controls-bar">
        <div className="fleet-search-wrap">
          <input
            type="text"
            className="fleet-search-input font-mono"
            placeholder="Search by Node ID, callsign, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="fleet-filter-group font-mono">
          <select
            className="forge-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ONLINE' | 'OFFLINE')}
          >
            <option value="ALL">ALL STATUS ({streams.length})</option>
            <option value="ONLINE">ONLINE ONLY ({onlineCount})</option>
            <option value="OFFLINE">OFFLINE ONLY ({streams.length - onlineCount})</option>
          </select>

          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰ Table
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid Card View"
            >
              ⊞ Grid
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="backend-offline-banner mb-3 font-mono">
          <span className="banner-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'grid' ? (
        <CameraGrid
          streams={processedStreams}
          loading={loading}
          onOpenConnectModal={onOpenConnectModal}
          onCameraDisconnected={(camId) => {
            onNotify(`Camera ${camId} disconnected.`, 'success');
            refreshStreams();
            refreshHealth();
          }}
          onError={(err) => onNotify(err, 'error')}
          showFilters={false}
        />
      ) : (
        <div className="tactical-panel-card border-tactical">
          <div className="table-responsive">
            <table className="tactical-table font-mono text-xs">
              <thead>
                <tr>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                    STATUS {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>
                    NODE ID {sortField === 'id' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>CALLSIGN / LOCATION</th>
                  <th onClick={() => handleSort('sector')} style={{ cursor: 'pointer' }}>
                    SECTOR {sortField === 'sector' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th>FEED TYPE</th>
                  <th onClick={() => handleSort('fps')} style={{ cursor: 'pointer' }}>
                    RESOLUTION / FPS {sortField === 'fps' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ textAlign: 'right' }}>COMMAND ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading && streams.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                      <span className="empty-spinner">↻</span> DISCOVERING PERIMETER CAMERA NODES...
                    </td>
                  </tr>
                ) : processedStreams.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      {streams.length === 0
                        ? 'No camera nodes registered in the system. Click "+ Deploy Camera Node" to connect feeds.'
                        : 'No cameras match the selected search query or filters.'}
                    </td>
                  </tr>
                ) : (
                  processedStreams.map((stream) => {
                    const isOnline = stream.status?.toUpperCase() === 'ONLINE';
                    return (
                      <tr key={stream.camera_id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`tile-beacon ${isOnline ? 'active' : 'inactive'}`} />
                            <StatusBadge status={stream.status} size="sm" />
                          </div>
                        </td>
                        <td>
                          <strong className="text-cream text-sm">{stream.camera_id}</strong>
                        </td>
                        <td>
                          <div className="font-sans font-medium text-cream">{stream.location || 'Perimeter'}</div>
                          <div className="text-muted text-xs">{stream.location || 'Unassigned Zone'}</div>
                        </td>
                        <td>
                          <span className="sector-tag">{stream.sector || 'SEC-01'}</span>
                        </td>
                        <td className="text-muted">
                          {stream.source_type?.toUpperCase() || (stream.source_url?.startsWith('http') ? 'RTSP/HLS' : 'CCTV PRESET')}
                        </td>
                        <td>
                          <div>{stream.health?.resolution || '480x848'}</div>
                          <div className="text-muted">{stream.health?.fps ? `${stream.health.fps.toFixed(1)} FPS` : '29.0 FPS'}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="fleet-row-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => navigate(`/surveillance?camera=${stream.camera_id}`)}
                              title="Monitor live stream on surveillance stage"
                            >
                              Live Ops
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => navigate(`/zones?camera=${stream.camera_id}`)}
                              title="Configure perimeter boundaries & tripwires"
                            >
                              Zones
                            </button>
                            <button
                              type="button"
                              className={`btn btn-xs ${isOnline ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => handleToggleStream(stream.camera_id, stream.status)}
                              title={isOnline ? 'Halt ingestion worker' : 'Start ingestion worker'}
                            >
                              {isOnline ? 'Stop' : 'Start'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-xs"
                              onClick={() => handleDisconnect(stream.camera_id)}
                              title="Decommission camera node"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
