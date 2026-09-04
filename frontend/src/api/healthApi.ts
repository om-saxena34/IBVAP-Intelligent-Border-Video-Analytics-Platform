/**
 * Health API
 * Wraps GET /health endpoint from the IBVAP backend.
 */
import { apiClient } from './client';

export interface SystemHealth {
  status: string;
  platform: string;
  version: string;
  timestamp: string;
  uptime_seconds: number;
  total_cameras: number;
  online_cameras: number;
}

export interface RootInfo {
  platform: string;
  version: string;
  tagline: string;
  status: string;
  docs_url: string;
  health_url: string;
  streams_url: string;
}

export const healthApi = {
  /** GET /health — full system health, uptime, camera counts */
  getHealth: () => apiClient.get<SystemHealth>('/health'),

  /** GET / — platform root info */
  getRoot: () => apiClient.get<RootInfo>('/'),
};
