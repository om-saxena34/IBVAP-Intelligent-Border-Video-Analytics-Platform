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
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Intelligence & Traffic Analytics</h1>

          <p>
            Sector movement density, perimeter events, AI detections,
            and surveillance intelligence metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-state">
          <strong>Unable to load analytics</strong>
          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadAnalytics()}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          Loading intelligence analytics...
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="analytics-summary-grid">
            <div className="analytics-summary-card">
              <span>Total Events</span>
              <strong>
                {numberValue(summary.total_events)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Events Today</span>
              <strong>
                {numberValue(summary.events_today)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Active Alerts</span>
              <strong>
                {numberValue(summary.active_alerts)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>AI Detections</span>
              <strong>
                {numberValue(summary.total_detections)}
              </strong>
            </div>
          </div>

          {/* Severity */}
          <section className="dashboard-section">
            <div className="section-header-bar">
              <div className="section-title-wrap">
                <span className="section-indicator" />

                <div>
                  <h3 className="section-heading">
                    Threat Severity Distribution
                  </h3>

                  <span className="section-caption">
                    Current surveillance event severity
                  </span>
                </div>
              </div>
            </div>

            <div className="analytics-summary-grid">
              <div className="analytics-summary-card">
                <span>Critical</span>
                <strong>
                  {numberValue(summary.critical_events)}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span>High</span>
                <strong>
                  {numberValue(summary.high_events)}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span>Medium</span>
                <strong>
                  {numberValue(summary.medium_events)}
                </strong>
              </div>

              <div className="analytics-summary-card">
                <span>Low</span>
                <strong>
                  {numberValue(summary.low_events)}
                </strong>
              </div>
            </div>
          </section>

          {/* Event Analytics */}
          <section className="dashboard-section">
            <div className="section-header-bar">
              <div className="section-title-wrap">
                <span className="section-indicator" />

                <div>
                  <h3 className="section-heading">
                    Detection Event Breakdown
                  </h3>

                  <span className="section-caption">
                    Events generated by the AI analytics pipeline
                  </span>
                </div>
              </div>
            </div>

            {eventBreakdown.length === 0 ? (
              <div className="empty-state">
                No analytics events available yet.
              </div>
            ) : (
              <div className="analytics-summary-grid">
                {eventBreakdown.map(([eventType, count]) => (
                  <div
                    className="analytics-summary-card"
                    key={eventType}
                  >
                    <span>
                      {formatEventType(eventType)}
                    </span>

                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Events */}
          <section className="dashboard-section">
            <div className="section-header-bar">
              <div className="section-title-wrap">
                <span className="section-indicator" />

                <div>
                  <h3 className="section-heading">
                    Recent Intelligence Events
                  </h3>

                  <span className="section-caption">
                    Latest events received from surveillance analytics
                  </span>
                </div>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="empty-state">
                No recent analytics events.
              </div>
            ) : (
              <div className="events-list">
                {events.slice(0, 10).map((event, index) => (
                  <article
                    className="event-card"
                    key={`${event.timestamp ?? 'event'}-${index}`}
                  >
                    <div className="event-card-main">
                      <div className="event-card-title">
                        <div>
                          <h2>
                            {formatEventType(
                              typeof event.event_type === 'string'
                                ? event.event_type
                                : 'Unknown Event',
                            )}
                          </h2>

                          <div className="event-meta">
                            <span>
                              Camera:{' '}
                              {typeof event.camera_id === 'string'
                                ? event.camera_id
                                : 'Unknown'}
                            </span>

                            {typeof event.severity === 'string' && (
                              <span>
                                Severity: {event.severity}
                              </span>
                            )}
                          </div>
                        </div>

                        {typeof event.severity === 'string' && (
                          <span
                            className={`event-severity event-${event.severity.toLowerCase()}`}
                          >
                            {event.severity}
                          </span>
                        )}
                      </div>

                      {typeof event.timestamp === 'string' && (
                        <div className="event-card-details">
                          <div>
                            <span className="event-field-label">
                              Timestamp
                            </span>

                            <strong>
                              {new Date(
                                event.timestamp,
                              ).toLocaleString()}
                            </strong>
                          </div>

                          <div>
                            <span className="event-field-label">
                              Source
                            </span>

                            <strong>AI Analytics</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}