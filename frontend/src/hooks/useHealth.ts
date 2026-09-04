/**
 * useHealth — polling hook for GET /health
 */
import { useState, useEffect, useCallback } from 'react';
import { healthApi, type SystemHealth } from '../api/healthApi';

interface UseHealthResult {
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useHealth(pollIntervalMs = 10000): UseHealthResult {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    const res = await healthApi.getHealth();
    if (res.ok) {
      setHealth(res.data);
      setError(null);
      setLastUpdated(new Date());
    } else {
      setError(res.error);
      setHealth(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetch, pollIntervalMs]);

  return { health, loading, error, lastUpdated, refresh: fetch };
}
