/**
 * Events API
 * Wraps /events endpoints from the IBVAP backend.
 */
import { apiClient } from './client';
import type { Severity } from './alertsApi';

export type EventType =
  | 'PERSON_DETECTED'
  | 'VEHICLE_DETECTED'
  | 'FACE_DETECTED'
  | 'ANPR_DETECTED'
  | 'VIRTUAL_FENCE_BREACH'
  | 'RESTRICTED_ZONE_ENTRY'
  | 'LOITERING'
  | 'UNUSUAL_MOVEMENT'
  | 'NIGHT_TIME_MOVEMENT'
  | 'GROUP_MOVEMENT'
  | 'SUSPICIOUS_SEQUENCE'
  | string;

export interface Event {
  id: number;
  camera_id: string;
  event_type: EventType;
  severity: Severity;
  timestamp: string;
  confidence: number;
  details?: Record<string, unknown> | null;
}

export interface EventListResponse {
  total: number;
  events: Event[];
}

export interface CreateEventRequest {
  camera_id: string;
  event_type: EventType;
  severity: Severity;
  confidence?: number;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export const eventsApi = {
  /** GET /events — retrieve detected border events */
  listEvents: (params?: { camera_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.camera_id) query.set('camera_id', params.camera_id);
    const qs = query.toString();
    return apiClient.get<EventListResponse>(`/events${qs ? `?${qs}` : ''}`);
  },

  /** POST /events — record a new event */
  createEvent: (req: CreateEventRequest) =>
    apiClient.post<Event>('/events', req),
};
