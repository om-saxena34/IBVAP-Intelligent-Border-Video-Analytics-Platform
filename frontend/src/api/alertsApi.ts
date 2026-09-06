/**
 * Alerts API
 * Wraps /alerts endpoints from the IBVAP backend.
 */
import { apiClient } from './client';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export interface Alert {
  id: number;
  camera_id: string;
  event_type: string;
  severity: Severity;
  status: AlertStatus;
  timestamp: string;
  confidence?: number;
  details?: Record<string, unknown> | null;
}

export interface AlertListResponse {
  total: number;
  alerts: Alert[];
}

export interface CreateAlertRequest {
  camera_id: string;
  event_type: string;
  severity: Severity;
  status?: AlertStatus;
  confidence?: number;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export const alertsApi = {
  /** GET /alerts — retrieve all generated alerts */
  listAlerts: (params?: { camera_id?: string; status?: AlertStatus; severity?: Severity }) => {
    const query = new URLSearchParams();
    if (params?.camera_id) query.set('camera_id', params.camera_id);
    if (params?.status) query.set('status', params.status);
    if (params?.severity) query.set('severity', params.severity);
    const qs = query.toString();
    return apiClient.get<AlertListResponse>(`/alerts${qs ? `?${qs}` : ''}`);
  },

  /** PATCH /alerts/:id/resolve — mark an alert as resolved */
  resolveAlert: (alertId: number) =>
    apiClient.patch<Alert>(`/alerts/${alertId}/resolve`),
};
