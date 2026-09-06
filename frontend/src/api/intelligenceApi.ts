/**
 * Border Intelligence & Virtual Fence API
 * Wraps /intelligence/* endpoints from the IBVAP backend.
 */
import { apiClient } from './client';
import type { Event } from './eventsApi';
import type { Severity } from './alertsApi';

export type ZoneType = 'tripwire' | 'restricted' | 'loitering' | 'perimeter';

export interface Point {
  x: number;
  y: number;
}

export interface ZoneConfig {
  zone_id: string;
  camera_id: string;
  zone_name: string;
  zone_type: ZoneType;
  coordinates: Point[];
  loitering_threshold_sec: number;
  is_active: boolean;
  color?: string;
  created_at: string;
}

export interface ZoneListResponse {
  total: number;
  zones: ZoneConfig[];
}

export interface CreateZoneRequest {
  zone_id?: string;
  camera_id: string;
  zone_name: string;
  zone_type: ZoneType;
  coordinates: Point[];
  loitering_threshold_sec?: number;
  is_active?: boolean;
  color?: string;
}

export interface SimulateDetectionRequest {
  camera_id: string;
  event_type: string;
  subject_type?: string;
  severity?: Severity;
  confidence?: number;
  custom_details?: Record<string, unknown>;
}

export const intelligenceApi = {
  /** GET /intelligence/zones — list configured virtual fences and zones */
  listZones: (cameraId?: string) => {
    const qs = cameraId ? `?camera_id=${encodeURIComponent(cameraId)}` : '';
    return apiClient.get<ZoneListResponse>(`/intelligence/zones${qs}`);
  },

  /** POST /intelligence/zones — create or update a zone */
  createZone: (req: CreateZoneRequest) =>
    apiClient.post<ZoneConfig>('/intelligence/zones', req),

  /** DELETE /intelligence/zones/:id — delete a zone */
  deleteZone: (zoneId: string) =>
    apiClient.delete<{ message: string; zone_id: string }>(
      `/intelligence/zones/${encodeURIComponent(zoneId)}`
    ),

  /** POST /intelligence/simulate — simulate a detection rule trigger */
  simulateDetection: (req: SimulateDetectionRequest) =>
    apiClient.post<Event>('/intelligence/simulate', req),
};
