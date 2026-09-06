import { useState, useEffect, useCallback } from 'react';
import { alertsApi, type Alert } from '../api/alertsApi';

export function useAlerts(pollIntervalMs = 4000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await alertsApi.listAlerts();
      if (res.ok) {
        setAlerts(res.data.alerts);
        setTotal(res.data.total);
        setError(null);
      } else {
        setError(res.error || 'Failed to fetch alerts');
      }
    } catch {
      setError('Unable to communicate with alerts API');
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveAlert = useCallback(
    async (alertId: number) => {
      try {
        const res = await alertsApi.resolveAlert(alertId);
        if (res.ok) {
          setAlerts((prev) =>
            prev.map((a) => (a.id === alertId ? res.data : a))
          );
          return { ok: true as const, alert: res.data };
        } else {
          return { ok: false as const, error: res.error };
        }
      } catch {
        return { ok: false as const, error: 'Failed to resolve alert' };
      }
    },
    []
  );

  useEffect(() => {
    fetchAlerts();
    if (pollIntervalMs > 0) {
      const interval = setInterval(fetchAlerts, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchAlerts, pollIntervalMs]);

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED');

  return {
    alerts,
    total,
    activeAlerts,
    resolvedAlerts,
    activeCount: activeAlerts.length,
    loading,
    error,
    refresh: fetchAlerts,
    resolveAlert,
  };
}
