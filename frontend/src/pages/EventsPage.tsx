import { useState, useMemo, useCallback } from 'react';
import { useEvents } from '../hooks/useEvents';
import { intelligenceApi } from '../api/intelligenceApi';
import type { Severity } from '../api/alertsApi';

const EVENT_TYPES = [
  'ALL',
  'VIRTUAL_FENCE_BREACH',
  'RESTRICTED_ZONE_ENTRY',
  'LOITERING',
  'UNUSUAL_MOVEMENT',
  'NIGHT_TIME_MOVEMENT',
  'GROUP_MOVEMENT',
  'SUSPICIOUS_SEQUENCE',
  'PERSON_DETECTED',
  'VEHICLE_DETECTED',
  'FACE_DETECTED',
  'ANPR_DETECTED',
] as const;

export default function EventsPage() {
  const { events, loading, error, refresh } = useEvents(3500);

  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [cameraSearch, setCameraSearch] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  const criticalCount = useMemo(
    () => events.filter((event) => event.severity === 'CRITICAL').length,
    [events]
  );

  const highCount = useMemo(
    () => events.filter((event) => event.severity === 'HIGH').length,
    [events]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedType !== 'ALL' && e.event_type !== selectedType) return false;
      if (severityFilter !== 'ALL' && e.severity !== severityFilter) return false;
      if (
        cameraSearch &&
        !e.camera_id.toLowerCase().includes(cameraSearch.toLowerCase()) &&
        !e.event_type.toLowerCase().includes(cameraSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [events, selectedType, severityFilter, cameraSearch]);

  const handleSimulate = async (eventType: string) => {
    setIsSimulating(true);
    try {
      await intelligenceApi.simulateDetection({
        camera_id: 'CAM-001',
        event_type: eventType,
      });
      refresh();
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    } catch {
      return { time: ts, date: '' };
    }
  };

  const getSeverityClass = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
        return 'badge-low';
      default:
        return 'badge-low';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'VIRTUAL_FENCE_BREACH':
        return '⚡';
      case 'RESTRICTED_ZONE_ENTRY':
        return '🛑';
      case 'LOITERING':
        return '⏳';
      case 'UNUSUAL_MOVEMENT':
        return '🔄';
      case 'NIGHT_TIME_MOVEMENT':
        return '🌙';
      case 'GROUP_MOVEMENT':
        return '👥';
      case 'SUSPICIOUS_SEQUENCE':
        return '🔗';
      case 'PERSON_DETECTED':
        return '👤';
      case 'VEHICLE_DETECTED':
        return '🚗';
      case 'FACE_DETECTED':
        return '🔍';
      case 'ANPR_DETECTED':
        return '🔢';
      default:
        return '📋';
    }
  };

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator blue-glow" />
          <div>
            <h2 className="section-heading">Surveillance Event Journal</h2>
            <span className="section-caption">
              Continuous chronological audit log of optical detections, tripwire breaches, and perimeter movements
            </span>
          </div>
        </div>

        <div className="header-actions-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-tactical btn-sm"
            onClick={() => void handleRefresh()}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-tactical btn-sm"
            onClick={() => handleSimulate('RESTRICTED_ZONE_ENTRY')}
            disabled={isSimulating}
          >
            ⚡ Test Event Simulation
          </button>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="alerts-summary-ribbon" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
        <div className="ribbon-card">
          <span className="ribbon-label">TOTAL EVENTS</span>
          <span className="ribbon-val text-primary font-mono">{events.length}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">EVENTS TODAY</span>
          <span className="ribbon-val text-blue font-mono">{todayEvents.length}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">CRITICAL EVENTS</span>
          <span className="ribbon-val text-red font-mono" style={{ color: '#ef4444' }}>{criticalCount}</span>
        </div>
        <div className="ribbon-card">
          <span className="ribbon-label">HIGH EVENTS</span>
          <span className="ribbon-val text-orange font-mono" style={{ color: '#f97316' }}>{highCount}</span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="tactical-filter-bar">
        <div className="filter-group">
          <span className="filter-label">EVENT TYPE:</span>
          <select
            className="form-select font-mono filter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">SEVERITY:</span>
          <div className="filter-pills">
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                className={`filter-pill ${severityFilter === sev ? 'active' : ''}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="search-group">
          <input
            type="text"
            className="filter-search-input font-mono"
            placeholder="Search Camera or Threat Type..."
            value={cameraSearch}
            onChange={(e) => setCameraSearch(e.target.value)}
          />
          {cameraSearch && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setCameraSearch('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="modal-alert-error" role="alert" style={{ margin: '1rem 0' }}>
          <span className="alert-icon">⚠</span>
          <span>{error}</span>
          <button type="button" className="btn btn-sm" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {/* Main Events Table / List */}
      {loading && events.length === 0 ? (
        <div className="alert-loading-state" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Querying surveillance event telemetry...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="empty-state-icon" style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
          <h3>No Events Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            No surveillance events match the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="events-table-wrapper" style={{ marginTop: '1rem', overflowX: 'auto' }}>
          <table className="events-table font-mono" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color, #333)' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>EVENT TYPE</th>
                <th style={{ padding: '0.75rem' }}>CAMERA</th>
                <th style={{ padding: '0.75rem' }}>SEVERITY</th>
                <th style={{ padding: '0.75rem' }}>CONFIDENCE</th>
                <th style={{ padding: '0.75rem' }}>TIMESTAMP</th>
                <th style={{ padding: '0.75rem' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt) => {
                const { time, date } = formatTimestamp(evt.timestamp);
                return (
                  <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.05))' }}>
                    <td style={{ padding: '0.75rem', opacity: 0.7 }}>#{evt.id}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="event-type-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{getEventTypeIcon(evt.event_type)}</span>
                        <span>{evt.event_type.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="camera-pill font-mono">{evt.camera_id}</span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`severity-tag ${getSeverityClass(evt.severity)}`}>
                        {evt.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="conf-pill font-mono">
                        {evt.confidence ? `${(evt.confidence * 100).toFixed(0)}%` : '92%'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div className="time-cell font-mono">
                        <span className="time-primary" style={{ display: 'block' }}>{time}</span>
                        <span className="time-secondary text-muted" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{date}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div className="details-cell font-mono text-muted" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        {evt.details && (evt.details as Record<string, unknown>).rule ? (
                          <span>{String((evt.details as Record<string, unknown>).rule)}</span>
                        ) : (
                          <span>Optical AI telemetry verification</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}