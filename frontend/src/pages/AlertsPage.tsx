import { useCallback, useEffect, useMemo, useState } from "react";
import { alertsApi } from "../api/client";

import type {
  Alert,
  AlertStatus,
  Severity,
} from "../api/client";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const REFRESH_INTERVAL = 5000;

function severityClass(severity: Severity): string {
  switch (severity) {
    case "CRITICAL":
      return "alert-severity alert-critical";

    case "HIGH":
      return "alert-severity alert-high";

    case "MEDIUM":
      return "alert-severity alert-medium";

    case "LOW":
    default:
      return "alert-severity alert-low";
  }
}

function statusClass(status: AlertStatus): string {
  if (status === "ACTIVE") {
    return "alert-status alert-status-active";
  }

  return "alert-status alert-status-resolved";
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [resolvingId, setResolvingId] = useState<number | null>(
    null,
  );

  const [filter, setFilter] = useState<
    "ALL" | "ACTIVE" | "RESOLVED"
  >("ACTIVE");

  /* ------------------------------------------------------------------------ */
  /* Load alerts                                                              */
  /* ------------------------------------------------------------------------ */

  const loadAlerts = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await alertsApi.list();

      if (response.ok) {
        setAlerts(response.data.alerts);
        setError(null);
      } else {
        setError(response.error);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /* Initial load + automatic refresh                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    void loadAlerts();

    const interval = window.setInterval(() => {
      void loadAlerts(true);
    }, REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

  /* ------------------------------------------------------------------------ */
  /* Statistics                                                               */
  /* ------------------------------------------------------------------------ */

  const activeCount = useMemo(() => {
    return alerts.filter(
      (alert) => alert.status === "ACTIVE",
    ).length;
  }, [alerts]);

  const criticalCount = useMemo(() => {
    return alerts.filter(
      (alert) =>
        alert.status === "ACTIVE" &&
        alert.severity === "CRITICAL",
    ).length;
  }, [alerts]);

  const highCount = useMemo(() => {
    return alerts.filter(
      (alert) =>
        alert.status === "ACTIVE" &&
        alert.severity === "HIGH",
    ).length;
  }, [alerts]);

  /* ------------------------------------------------------------------------ */
  /* Filtering                                                                */
  /* ------------------------------------------------------------------------ */

  const filteredAlerts = useMemo(() => {
    if (filter === "ACTIVE") {
      return alerts.filter(
        (alert) => alert.status === "ACTIVE",
      );
    }

    if (filter === "RESOLVED") {
      return alerts.filter(
        (alert) => alert.status === "RESOLVED",
      );
    }

    return alerts;
  }, [alerts, filter]);

  /* ------------------------------------------------------------------------ */
  /* Resolve alert                                                            */
  /* ------------------------------------------------------------------------ */

  const resolveAlert = async (alertId: number) => {
    setResolvingId(alertId);

    const response = await alertsApi.resolve(alertId);

    if (response.ok) {
      setAlerts((currentAlerts) =>
        currentAlerts.map((alert) =>
          alert.id === alertId
            ? response.data
            : alert,
        ),
      );

      setError(null);
    } else {
      setError(response.error);
    }

    setResolvingId(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Perimeter Threat Alerts</h1>

          <p>
            Real-time border intrusion alerts, tripwire
            breaches, and tactical anomalies.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAlerts(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary */}
      <div className="analytics-summary-grid">
        <div className="analytics-summary-card">
          <span>Total Alerts</span>
          <strong>{alerts.length}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>Active Alerts</span>
          <strong>{activeCount}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>Critical</span>
          <strong>{criticalCount}</strong>
        </div>

        <div className="analytics-summary-card">
          <span>High</span>
          <strong>{highCount}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="alerts-toolbar">
        <button
          type="button"
          onClick={() => setFilter("ACTIVE")}
          className={
            filter === "ACTIVE"
              ? "active"
              : ""
          }
        >
          Active
        </button>

        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={
            filter === "ALL"
              ? "active"
              : ""
          }
        >
          All
        </button>

        <button
          type="button"
          onClick={() => setFilter("RESOLVED")}
          className={
            filter === "RESOLVED"
              ? "active"
              : ""
          }
        >
          Resolved
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-state">
          <strong>
            Unable to load alerts
          </strong>

          <span>{error}</span>

          <button
            type="button"
            onClick={() => void loadAlerts()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="empty-state">
          Loading alerts...
        </div>
      ) : filteredAlerts.length === 0 ? (
        /* Empty */
        <div className="empty-state">
          <div className="empty-state-icon">
            ✓
          </div>

          <h2>No alerts</h2>

          <p>
            There are no{" "}
            {filter.toLowerCase()} alerts
            available.
          </p>
        </div>
      ) : (
        /* Alerts */
        <div className="alerts-list">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              resolving={
                resolvingId === alert.id
              }
              onResolve={resolveAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Alert Card                                                                 */
/* -------------------------------------------------------------------------- */

interface AlertCardProps {
  alert: Alert;
  resolving: boolean;
  onResolve: (
    alertId: number,
  ) => Promise<void>;
}

function AlertCard({
  alert,
  resolving,
  onResolve,
}: AlertCardProps) {
  return (
    <article className="alert-card">
      {/* Card header */}
      <div className="alert-card-header">
        <div>
          <h2>
            {alert.event_type}
          </h2>

          <div className="alert-meta">
            <span>
              Alert #{alert.id}
            </span>

            <span>
              Camera: {alert.camera_id}
            </span>
          </div>
        </div>

        <div className="alert-badges">
          <span
            className={severityClass(
              alert.severity,
            )}
          >
            {alert.severity}
          </span>

          <span
            className={statusClass(
              alert.status,
            )}
          >
            {alert.status}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="alert-card-body">
        <div>
          <span className="alert-field-label">
            Detected
          </span>

          <strong>
            {formatTimestamp(
              alert.timestamp,
            )}
          </strong>
        </div>

        {alert.status === "ACTIVE" && (
          <button
            type="button"
            onClick={() =>
              void onResolve(alert.id)
            }
            disabled={resolving}
          >
            {resolving
              ? "Resolving..."
              : "Resolve Alert"}
          </button>
        )}
      </div>
    </article>
  );
}