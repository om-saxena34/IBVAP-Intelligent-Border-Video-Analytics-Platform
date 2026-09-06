import { useState, useEffect, useCallback } from 'react';
import { eventsApi, type Event, type CreateEventRequest } from '../api/eventsApi';

export function useEvents(pollIntervalMs = 4000) {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await eventsApi.listEvents();
      if (res.ok) {
        setEvents(res.data.events);
        setTotal(res.data.total);
        setError(null);
      } else {
        setError(res.error || 'Failed to fetch events');
      }
    } catch {
      setError('Unable to communicate with events API');
    } finally {
      setLoading(false);
    }
  }, []);

  const createEvent = useCallback(
    async (req: CreateEventRequest) => {
      try {
        const res = await eventsApi.createEvent(req);
        if (res.ok) {
          setEvents((prev) => [res.data, ...prev]);
          setTotal((prev) => prev + 1);
          return { ok: true as const, event: res.data };
        } else {
          return { ok: false as const, error: res.error };
        }
      } catch {
        return { ok: false as const, error: 'Failed to create event' };
      }
    },
    []
  );

  useEffect(() => {
    fetchEvents();
    if (pollIntervalMs > 0) {
      const interval = setInterval(fetchEvents, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchEvents, pollIntervalMs]);

  return {
    events,
    total,
    loading,
    error,
    refresh: fetchEvents,
    createEvent,
  };
}
