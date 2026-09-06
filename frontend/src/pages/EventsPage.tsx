import { useCallback, useEffect, useMemo, useState } from "react";
import { eventsApi } from "../api/client";

import type {
  Event,
  Severity,
} from "../api/client";

const REFRESH_INTERVAL = 5000;

type EventFilter = "ALL" | Severity;

function severityClass(severity: Severity): string {
  switch (severity) {
    case "CRITICAL":
      return "event-severity event-critical";

    case "HIGH":
      return "event-severity event-high";

    case "MEDIUM":
      return "event-severity event-medium";

    case "LOW":
    default:
      return "event-severity event-low";
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventFilter>("ALL");

  const loadEvents = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await eventsApi.list();

      if (response.ok) {
        const sortedEvents = [...response.data.events].sort(
          (a, b) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime(),
        );

        setEvents(sortedEvents);
        setError(null);
      } else {
        setError(response.error);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  useEffect(() => {
    void loadEvents();

    const interval = window.setInterval(() => {
      void loadEvents(true);
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadEvents]);

  const todayEvents = useMemo(() => {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    return events.filter((event) => {
      const timestamp = new Date(event.timestamp);

      return (
        timestamp >= startOfToday &&
        timestamp < startOfTomorrow
      );
    });
  }, [events]);

  const criticalCount = useMemo(
    () =>
      events.filter(
        (event) => event.severity === "CRITICAL",
      ).length,
    [events],
  );

  const highCount = useMemo(
    () =>
      events.filter(
        (event) => event.severity === "HIGH",
      ).length,
    [events],
  );

  const filteredEvents = useMemo(() => {
    if (filter === "ALL") {
      return events;
    }

    return events.filter(
      (event) => event.severity === filter,
    );
  }, [events, filter]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Surveillance Event Journal</h1>

          <p>
            Historical audit log of security events,
            motion detections, and perimeter activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadEvents(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary */}
      <div className="analytics-summary-grid">
        <div className="analytics-summary-card">
          <span>Total Events</span>
          <strong>{events.length}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>Events Today</span>
          <strong>{todayEvents.length}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>Critical Events</span>
          <strong>{criticalCount}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>High Events</span>
          <strong>{highCount}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="alerts-toolbar">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={filter === "ALL" ? "active" : ""}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => setFilter("CRITICAL")}
          className={
            filter === "CRITICAL" ? "active" : ""
          }
        >
          Critical
        </button>

        <button
          type="button"
          onClick={() => setFilter("HIGH")}
          className={
            filter === "HIGH" ? "active" : ""
          }
        >
          High
        </button>

        <button
          type="button"
          onClick={() => setFilter("MEDIUM")}
          className={
            filter === "MEDIUM" ? "active" : ""
          }
        >
          Medium
        </button>

        <button
          type="button"
          onClick={() => setFilter("LOW")}
          className={
            filter === "LOW" ? "active" : ""
          }
        >
          Low
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-state">
          <strong>Unable to load events</strong>

          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadEvents()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="empty-state">
          Loading events...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            ✓
          </div>

          <h2>No events found</h2>

          <p>
            There are no events matching the selected
            filter.
          </p>
        </div>
      ) : (
        <div className="events-list">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Event Card                                                                 */
/* -------------------------------------------------------------------------- */

interface EventCardProps {
  event: Event;
}

function EventCard({ event }: EventCardProps) {
  return (
    <article className="event-card">
      <div className="event-card-main">
        <div className="event-card-title">
          <div>
            <h2>{event.event_type}</h2>

            <div className="event-meta">
              <span>
                Event #{event.id}
              </span>

              <span>
                Camera: {event.camera_id}
              </span>
            </div>
          </div>

          <span
            className={severityClass(
              event.severity,
            )}
          >
            {event.severity}
          </span>
        </div>

        <div className="event-card-details">
          <div>
            <span className="event-field-label">
              Timestamp
            </span>

            <strong>
              {formatTimestamp(
                event.timestamp,
              )}
            </strong>
          </div>

          <div>
            <span className="event-field-label">
              Source
            </span>

            <strong>AI Analytics</strong>
          </div>
        </div>
      </div>
    </article>
  );
}