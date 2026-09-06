/**
 * IBVAP API Client
 *
 * Centralized, typed HTTP client for all backend communication.
 * Components/pages should never call fetch() directly.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* -------------------------------------------------------------------------- */
/* Common                                                                     */
/* -------------------------------------------------------------------------- */

export type ApiResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

/* -------------------------------------------------------------------------- */
/* Streams                                                                    */
/* -------------------------------------------------------------------------- */

export type StreamStatus =
  | "ONLINE"
  | "OFFLINE"
  | "RECONNECTING"
  | "ERROR";

export type StreamSourceType =
  | "RTSP"
  | "FILE"
  | "WEBCAM";

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

export interface StreamConnectRequest {
  camera_id: string;
  source_url: string;
  source_type?: StreamSourceType;
  location?: string | null;
  sector?: string | null;
  loop_video?: boolean;
  reconnect_interval_sec?: number | null;
  max_reconnect_attempts?: number | null;
}

export interface StreamDisconnectResponse {
  camera_id: string;
  status: StreamStatus;
  message: string;
}

/* -------------------------------------------------------------------------- */
/* Alerts                                                                     */
/* -------------------------------------------------------------------------- */

export type Severity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type AlertStatus =
  | "ACTIVE"
  | "RESOLVED";

export interface Alert {
  id: number;
  camera_id: string;
  event_type: string;
  severity: Severity;
  status: AlertStatus;
  timestamp: string;
}

export interface CreateAlertRequest {
  camera_id: string;
  event_type: string;
  severity: Severity;
}

export interface AlertListResponse {
  total: number;
  alerts: Alert[];
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

export interface Event {
  id: number;
  camera_id: string;
  event_type: string;
  severity: Severity;
  timestamp: string;
}

export interface CreateEventRequest {
  camera_id: string;
  event_type: string;
  severity: Severity;
}

export interface EventListResponse {
  total: number;
  events: Event[];
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectionResult {
  class: string;
  confidence: number;
  bbox: BoundingBox;
  track_id: number | null;
}

export interface FaceResult {
  class: string;
  bbox: BoundingBox;
  confidence?: number;
}

export interface PlateResult {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface AnalyticsEvent {
  event_type?: string;
  type?: string;
  name?: string;
  event?: string;
  severity?: Severity;
  [key: string]: unknown;
}

export interface AnalyticsFrameResponse {
  detections: DetectionResult[];
  faces: FaceResult[];
  plates: PlateResult[];
  events: AnalyticsEvent[];
}

/* -------------------------------------------------------------------------- */
/* Internal HTTP helpers                                                      */
/* -------------------------------------------------------------------------- */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal:
        options.signal ??
        AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`;

      try {
        const body = await response.json();

        if (typeof body?.detail === "string") {
          errorDetail = body.detail;
        } else if (typeof body?.message === "string") {
          errorDetail = body.message;
        }
      } catch {
        // Response was not JSON.
      }

      return {
        ok: false,
        error: errorDetail,
        status: response.status,
      };
    }

    /*
     * Some DELETE/POST endpoints may return an empty body.
     */
    if (response.status === 204) {
      return {
        ok: true,
        data: undefined as T,
      };
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = (await response.json()) as T;

      return {
        ok: true,
        data,
      };
    }

    const text = await response.text();

    return {
      ok: true,
      data: text as T,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        return {
          ok: false,
          error:
            "Request timed out. Backend may be unavailable.",
        };
      }

      if (
        error.name === "AbortError"
      ) {
        return {
          ok: false,
          error: "Request was cancelled.",
        };
      }

      if (
        error.name === "TypeError" ||
        error.message.toLowerCase().includes("fetch")
      ) {
        return {
          ok: false,
          error:
            "Unable to connect to IBVAP backend. Is the server running?",
        };
      }

      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: false,
      error: "An unexpected error occurred.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Binary                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchBlob(
  path: string,
): Promise<ApiResponse<Blob>> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
        status: response.status,
      };
    }

    return {
      ok: true,
      data: await response.blob(),
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: false,
      error: "Unexpected error fetching binary data.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Generic client                                                             */
/* -------------------------------------------------------------------------- */

export const apiClient = {
  get: <T>(
    path: string,
  ): Promise<ApiResponse<T>> =>
    request<T>(path),

  post: <T>(
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> =>
    request<T>(path, {
      method: "POST",
      body:
        body !== undefined
          ? JSON.stringify(body)
          : undefined,
    }),

  delete: <T>(
    path: string,
  ): Promise<ApiResponse<T>> =>
    request<T>(path, {
      method: "DELETE",
    }),

  getBaseUrl: (): string =>
    API_BASE_URL,
};

/* -------------------------------------------------------------------------- */
/* Stream API                                                                 */
/* -------------------------------------------------------------------------- */

export const streamsApi = {
  list: () =>
    apiClient.get<StreamInfo[]>("/streams"),

  get: (cameraId: string) =>
    apiClient.get<StreamInfo>(
      `/streams/${encodeURIComponent(cameraId)}`,
    ),

  health: (cameraId: string) =>
    apiClient.get<StreamHealth>(
      `/streams/${encodeURIComponent(cameraId)}/health`,
    ),

  connect: (request: StreamConnectRequest) =>
    apiClient.post<StreamInfo>(
      "/streams/connect",
      request,
    ),

  disconnect: (cameraId: string) =>
    apiClient.delete<StreamDisconnectResponse>(
      `/streams/${encodeURIComponent(cameraId)}`,
    ),

  snapshot: (cameraId: string) =>
    fetchBlob(
      `/streams/${encodeURIComponent(cameraId)}/snapshot`,
    ),
};

/* -------------------------------------------------------------------------- */
/* Alerts API                                                                 */
/* -------------------------------------------------------------------------- */

export const alertsApi = {
  list: () =>
    apiClient.get<AlertListResponse>("/alerts"),

  get: (alertId: number) =>
    apiClient.get<Alert>(
      `/alerts/${alertId}`,
    ),

  create: (request: CreateAlertRequest) =>
    apiClient.post<Alert>(
      "/alerts",
      request,
    ),

  resolve: (alertId: number) =>
    apiClient.post<Alert>(
      `/alerts/${alertId}/resolve`,
    ),

  active: async (): Promise<
    ApiResponse<Alert[]>
  > => {
    const response =
      await alertsApi.list();

    if (!response.ok) {
      return response;
    }

    return {
      ok: true,
      data: response.data.alerts.filter(
        (alert) =>
          alert.status === "ACTIVE",
      ),
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Events API                                                                 */
/* -------------------------------------------------------------------------- */

export const eventsApi = {
  list: () =>
    apiClient.get<EventListResponse>("/events"),

  create: (
    request: CreateEventRequest,
  ) =>
    apiClient.post<Event>(
      "/events",
      request,
    ),

  today: async (): Promise<
    ApiResponse<Event[]>
  > => {
    const response =
      await eventsApi.list();

    if (!response.ok) {
      return response;
    }

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    return {
      ok: true,
      data: response.data.events.filter(
        (event) => {
          const timestamp =
            new Date(event.timestamp);

          return (
            timestamp >= startOfToday &&
            timestamp < startOfTomorrow
          );
        },
      ),
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Analytics API                                                              */
/* -------------------------------------------------------------------------- */

export const analyticsApi = {
  analyzeFrame: (
    file: File,
  ): Promise<
    ApiResponse<AnalyticsFrameResponse>
  > => {
    const formData = new FormData();

    formData.append("file", file);

    const url =
      `${API_BASE_URL}/analytics/frame`;

    return fetch(url, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    })
      .then(async (response) => {
        if (!response.ok) {
          let detail = `HTTP ${response.status}`;

          try {
            const body =
              await response.json();

            if (
              typeof body?.detail ===
              "string"
            ) {
              detail = body.detail;
            }
          } catch {
            // Ignore invalid JSON.
          }

          return {
            ok: false as const,
            error: detail,
            status: response.status,
          };
        }

        return {
          ok: true as const,
          data:
            (await response.json()) as AnalyticsFrameResponse,
        };
      })
      .catch((error: unknown) => ({
        ok: false as const,
        error:
          error instanceof Error
            ? error.message
            : "Analytics request failed.",
      }));
  },
};