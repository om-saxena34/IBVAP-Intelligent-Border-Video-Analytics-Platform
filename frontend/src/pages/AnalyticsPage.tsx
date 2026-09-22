import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';

interface AnalyticsSummary {
  total_events?: number;
  events_today?: number;
  active_alerts?: number;
  critical_events?: number;
  high_events?: number;
  medium_events?: number;
  low_events?: number;
  total_detections?: number;
  cameras_analyzed?: number;
  [key: string]: unknown;
}

interface AnalyticsEvent {
  event_type?: string;
  severity?: string;
  camera_id?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface AnalyticsResponse {
  summary?: AnalyticsSummary;
  events?: AnalyticsEvent[];
  [key: string]: unknown;
}

const REFRESH_INTERVAL = 5000;

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function formatEventType(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const response = await apiClient.get<AnalyticsResponse>(
      '/analytics/summary',
    );

    if (response.ok) {
      setData(response.data);
      setError(null);
    } else {
      setError(response.error);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadAnalytics();

    const interval = window.setInterval(() => {
      void loadAnalytics(true);
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAnalytics]);

  const summary = data?.summary ?? {};

  const events = useMemo(
    () => (Array.isArray(data?.events) ? data.events : []),
    [data],
  );

  const eventBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const event of events) {
      const type =
        typeof event.event_type === 'string'
          ? event.event_type
          : 'unknown';

      counts[type] = (counts[type] ?? 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [events]);

  return (
    <div className="page-container analytics-page-forge">
      {/* Top Header Bar */}
      <div className="section-header-bar">
        <div className="section-title-wrap">
          <span className="section-indicator" />
          <div>
            <h2 className="section-heading font-display">Border Intelligence & Telemetry Analytics</h2>
            <span className="section-caption font-mono">
              EVENT CLUSTERING // THREAT DENSITY // DEEP VISION SENSING METRICS
            </span>
          </div>
        </div>

        <div className="header-action-buttons font-mono">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void loadAnalytics(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Syncing...' : '↻ Sync Telemetry'}
          </button>
        </div>
      </div>

      {error && (
        <div className="backend-offline-banner font-mono mb-4">
          <span className="banner-icon">⚠</span>
          <span>Unable to load intelligence analytics: {error}</span>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => void loadAnalytics()}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="surveillance-empty-state font-mono">
          <span className="empty-spinner">↻</span>
          <span>SYNCHRONIZING TELEMETRY METRICS...</span>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Cluster */}
          <div className="overview-kpi-cluster mb-4">
            <div className="forge-kpi">
              <span className="kpi-label font-mono">TOTAL EVENTS LOGGED</span>
              <div className="kpi-value-row">
                <strong className="kpi-value font-mono text-cream">{numberValue(summary.total_events)}</strong>
              </div>
            </div>
            <div className="forge-kpi">
              <span className="kpi-label font-mono">EVENTS TODAY</span>
              <div className="kpi-value-row">
                <strong className="kpi-value font-mono text-rust">{numberValue(summary.events_today)}</strong>
              </div>
            </div>
            <div className={`forge-kpi ${numberValue(summary.active_alerts) > 0 ? 'status-critical' : ''}`}>
              <span className="kpi-label font-mono">ACTIVE ALERTS</span>
              <div className="kpi-value-row">
                <strong className="kpi-value font-mono text-critical">{numberValue(summary.active_alerts)}</strong>
              </div>
            </div>
            <div className="forge-kpi">
              <span className="kpi-label font-mono">VISION DETECTIONS</span>
              <div className="kpi-value-row">
                <strong className="kpi-value font-mono text-orange">{numberValue(summary.total_detections)}</strong>
              </div>
            </div>
          </div>

          <div className="forge-supporting-grid mb-4">
            {/* Severity Distribution Panel */}
            <div className="tactical-panel-card border-tactical">
              <div className="panel-header">
                <div className="panel-title-group">
                  <span className="panel-tag font-mono">RISK STRATIFICATION</span>
                  <h3 className="panel-title font-display">Threat Severity Breakdown</h3>
                </div>
              </div>
              <div className="panel-body font-mono text-xs">
                <div className="detection-row">
                  <span className="text-critical font-bold">● CRITICAL SEVERITY:</span>
                  <strong className="text-cream">{numberValue(summary.critical_events)}</strong>
                </div>
                <div className="detection-row">
                  <span className="text-orange font-bold">● HIGH SEVERITY:</span>
                  <strong className="text-cream">{numberValue(summary.high_events)}</strong>
                </div>
                <div className="detection-row">
                  <span className="text-amber font-bold">● MEDIUM SEVERITY:</span>
                  <strong className="text-cream">{numberValue(summary.medium_events)}</strong>
                </div>
                <div className="detection-row">
                  <span className="text-muted font-bold">● LOW / INFORMATIONAL:</span>
                  <strong className="text-cream">{numberValue(summary.low_events)}</strong>
                </div>
              </div>
            </div>

            {/* Event Breakdown Panel */}
            <div className="tactical-panel-card border-tactical" style={{ gridColumn: 'span 2' }}>
              <div className="panel-header">
                <div className="panel-title-group">
                  <span className="panel-tag font-mono">AI DETECTIONS</span>
                  <h3 className="panel-title font-display">Detection Type Distribution</h3>
                </div>
                <span className="count-pill font-mono">{eventBreakdown.length} TYPES</span>
              </div>
              <div className="panel-body">
                {eventBreakdown.length === 0 ? (
                  <div className="panel-empty-state font-mono">
                    <span className="text-muted">No analytics events recorded yet.</span>
                  </div>
                ) : (
                  <div className="font-mono text-xs" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {eventBreakdown.map(([eventType, count]) => (
                      <div key={eventType} className="detection-row" style={{ background: 'var(--bg-surface-raised)', borderRadius: '2px' }}>
                        <span className="text-muted">{formatEventType(eventType)}</span>
                        <strong className="text-cream">{count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Intelligence Events Table */}
          <div className="tactical-panel-card border-tactical">
            <div className="panel-header">
              <div className="panel-title-group">
                <span className="panel-tag font-mono">AUDIT FEED</span>
                <h3 className="panel-title font-display">Recent Intelligence Events</h3>
              </div>
              <span className="count-pill font-mono">SHOWING LAST {Math.min(events.length, 10)}</span>
            </div>
            <div className="panel-body p-0">
              <div className="table-responsive">
                <table className="tactical-table font-mono text-xs">
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>CAMERA NODE</th>
                      <th>EVENT TYPE</th>
                      <th>SEVERITY</th>
                      <th>SOURCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No recent surveillance events on record.
                        </td>
                      </tr>
                    ) : (
                      events.slice(0, 10).map((event, idx) => (
                        <tr key={`${event.timestamp ?? 'ev'}-${idx}`}>
                          <td className="text-muted">
                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="text-cream font-bold">{event.camera_id || 'UNKNOWN'}</td>
                          <td className="text-rust">{formatEventType(event.event_type || 'Unknown')}</td>
                          <td>
                            <span className={`threat-sev-badge ${(event.severity || 'low').toLowerCase()}`}>
                              {event.severity || 'LOW'}
                            </span>
                          </td>
                          <td className="text-muted">AI Inference Engine</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}