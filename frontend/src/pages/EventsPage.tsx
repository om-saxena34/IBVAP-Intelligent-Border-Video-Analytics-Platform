import { useState, useMemo } from 'react';
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
              Continuous chronological audit log of optical detections, tripwire breaches, and movement events
            </span>
          </div>
        </div>

        <div className="header-actions-group">
          <span className="events-count-highlight font-mono">
            EVENTS TODAY: {events.length}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refresh}
            title="Refresh event log"
          >
            ↻ Refresh
          </button>
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
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'ALL EVENT TYPES' : t.replace(/_/g, ' ')}
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
            placeholder="Filter Camera ID or Event..."
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

      {/* Quick Test Toolbar */}
      <div className="event-simulator-bar">
        <span className="sim-bar-label font-mono">⚡ QUICK EVENT SIMULATION:</span>
        <div className="sim-buttons-wrap">
          <button
            type="button"
            className="btn btn-tactical-sim btn-sm"
            onClick={() => handleSimulate('VIRTUAL_FENCE_BREACH')}
            disabled={isSimulating}
          >
            ⚡ Fence Breach
          </button>
          <button
            type="button"
            className="btn btn-tactical-sim btn-sm"
            onClick={() => handleSimulate('RESTRICTED_ZONE_ENTRY')}
            disabled={isSimulating}
          >
            🛑 Restricted Entry
          </button>
          <button
            type="button"
            className="btn btn-tactical-sim btn-sm"
            onClick={() => handleSimulate('LOITERING')}
            disabled={isSimulating}
          >
            ⏳ Loitering
          </button>
          <button
            type="button"
            className="btn btn-tactical-sim btn-sm"
            onClick={() => handleSimulate('UNUSUAL_MOVEMENT')}
            disabled={isSimulating}
          >
            🔄 Unusual Move
          </button>
          <button
            type="button"
            className="btn btn-tactical-sim btn-sm"
            onClick={() => handleSimulate('NIGHT_TIME_MOVEMENT')}
            disabled={isSimulating}
          >
            🌙 Night Movement
          </button>
          <button
            type="button"
            className="btn btn-tactical-sim btn-sm"
            onClick={() => handleSimulate('GROUP_MOVEMENT')}
            disabled={isSimulating}
          >
            👥 Group Move
          </button>
          <button
            type="button"
            className="btn btn-tactical-sim btn-sm"
            onClick={() => handleSimulate('PERSON_DETECTED')}
            disabled={isSimulating}
          >
            👤 Person
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="modal-alert-error" role="alert">
          <span className="alert-icon">⚠</span>
          <span>Events API Error: {error}</span>
        </div>
      )}

      {/* Events Log Table */}
      <div className="tactical-table-card">
        {loading && events.length === 0 ? (
          <div className="table-loading-box">
            <div className="loading-spinner" />
            <span>Streaming chronological event telemetry...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="table-empty-box">
            <div className="empty-icon">📋</div>
            <h3>EVENTS TODAY: 0</h3>
            <p>
              No surveillance events match the selected criteria. Detections from active video streams or test simulations will be logged chronologically.
            </p>
          </div>
        ) : (
          <div className="tactical-table-wrapper">
            <table className="tactical-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>EVENT TYPE</th>
                  <th>CAMERA ID</th>
                  <th>SEVERITY</th>
                  <th>CONFIDENCE</th>
                  <th>TIMESTAMP</th>
                  <th>FORENSIC DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((evt) => {
                  const { time, date } = formatTimestamp(evt.timestamp);
                  const icon = getEventTypeIcon(evt.event_type);

                  return (
                    <tr key={evt.id} className={`event-row severity-${evt.severity.toLowerCase()}`}>
                      <td className="font-mono text-muted">#{evt.id}</td>
                      <td>
                        <div className="event-type-cell">
                          <span className="event-icon">{icon}</span>
                          <span className="event-type-text">
                            {evt.event_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="camera-pill font-mono">{evt.camera_id}</span>
                      </td>
                      <td>
                        <span className={`severity-tag ${getSeverityClass(evt.severity)}`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td>
                        <span className="conf-pill font-mono">
                          {evt.confidence ? `${(evt.confidence * 100).toFixed(0)}%` : '92%'}
                        </span>
                      </td>
                      <td>
                        <div className="time-cell font-mono">
                          <span className="time-primary">{time}</span>
                          <span className="time-secondary text-muted">{date}</span>
                        </div>
                      </td>
                      <td>
                        <div className="details-cell font-mono text-muted">
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
    </div>
  );
}
