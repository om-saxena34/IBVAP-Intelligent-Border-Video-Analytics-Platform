/**
 * useStreams — polling hook for GET /streams
 */
import { useState, useEffect, useCallback } from 'react';
import { streamsApi, type StreamInfo } from '../api/streamsApi';

interface UseStreamsResult {
  streams: StreamInfo[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useStreams(pollIntervalMs = 8000): UseStreamsResult {
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStreams = useCallback(async () => {
    const res = await streamsApi.listStreams();
    if (res.ok) {
      setStreams(res.data);
      setError(null);
      setLastUpdated(new Date());
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStreams();
    const id = setInterval(fetchStreams, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchStreams, pollIntervalMs]);

  return { streams, loading, error, lastUpdated, refresh: fetchStreams };
}
