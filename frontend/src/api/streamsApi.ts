/**
 * Streams API
 * Wraps all /streams/* endpoints from the IBVAP backend.
 * Schemas mirror backend/models/camera.py exactly.
 */
import { apiClient, fetchBlob } from './client';

export type StreamStatus = 'ONLINE' | 'OFFLINE' | 'RECONNECTING' | 'ERROR';
export type StreamSourceType = 'RTSP' | 'FILE' | 'WEBCAM';

export interface StreamHealth {
  camera_id: string;
  status: StreamStatus;
  fps: number;
  source_fps: number;
  resolution: string;
  total_frames_read: number;
  dropped_frames: number;
  reconnect_count: number;
  last_frame_timestamp: string | null;
  last_error: string | null;
  uptime_seconds: number;
}

export interface StreamInfo {
  camera_id: string;
  source_url: string;
  source_type: StreamSourceType;
  location: string | null;
  sector: string | null;
  status: StreamStatus;
  created_at: string;
  health: StreamHealth;
}

export interface StreamDisconnectResponse {
  camera_id: string;
  status: StreamStatus;
  message: string;
}

export interface StreamConnectRequest {
  camera_id: string;
  source_url: string;
  source_type?: StreamSourceType;
  location?: string;
  sector?: string;
  loop_video?: boolean;
  reconnect_interval_sec?: number;
  max_reconnect_attempts?: number;
}

export const streamsApi = {
  /** GET /streams — list all registered camera streams */
  listStreams: () => apiClient.get<StreamInfo[]>('/streams'),

  /** GET /streams/:id — single stream detail */
  getStream: (cameraId: string) =>
    apiClient.get<StreamInfo>(`/streams/${encodeURIComponent(cameraId)}`),

  /** GET /streams/:id/health — real-time health metrics */
  getStreamHealth: (cameraId: string) =>
    apiClient.get<StreamHealth>(`/streams/${encodeURIComponent(cameraId)}/health`),

  /** POST /streams/connect — register & start a stream */
  connectStream: (req: StreamConnectRequest) =>
    apiClient.post<StreamInfo>('/streams/connect', req),

  /** POST /streams/:id/disconnect — stop a stream */
  disconnectStream: (cameraId: string) =>
    apiClient.post<StreamDisconnectResponse>(
      `/streams/${encodeURIComponent(cameraId)}/disconnect`
    ),

  /**
   * GET /streams/:id/detections — real-time structured detection telemetry
   */
  getDetections: (cameraId: string) =>
    apiClient.get<any>(`/streams/${encodeURIComponent(cameraId)}/detections`),

  /**
   * GET /streams/:id/snapshot — returns JPEG image as a Blob URL
   * Supports ?annotated=true for AI overlays
   */
  getSnapshotUrl: (cameraId: string, annotated: boolean = true) =>
    fetchBlob(`/streams/${encodeURIComponent(cameraId)}/snapshot?annotated=${annotated}`),

  /** Returns a direct URL string for use in <img> src */
  getSnapshotSrc: (cameraId: string, annotated: boolean = true) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${base}/streams/${encodeURIComponent(cameraId)}/snapshot?annotated=${annotated}`;
  },

  /** Returns a direct MJPEG video stream URL */
  getLiveStreamUrl: (cameraId: string, annotated: boolean = true) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${base}/streams/${encodeURIComponent(cameraId)}/live?annotated=${annotated}`;
  },

  /** Upload a local video file to backend samples/ */
  uploadVideo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${base}/streams/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        return { ok: false as const, error: `Upload failed (HTTP ${res.status})` };
      }
      const data = await res.json();
      return { ok: true as const, data };
    } catch (e: unknown) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Upload failed' };
    }
  },
};
