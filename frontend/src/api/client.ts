/**
 * IBVAP API Client
 * Centralized HTTP client for all backend communication.
 * All fetch calls go through here — never scatter fetch() in components.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
      ...options,
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errorDetail = body?.detail || errorDetail;
      } catch {
        // ignore parse error
      }
      return { ok: false, error: errorDetail, status: res.status };
    }

    const data: T = await res.json();
    return { ok: true, data };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'TimeoutError') {
        return { ok: false, error: 'Request timed out. Backend may be unavailable.' };
      }
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        return { ok: false, error: 'Unable to connect to IBVAP backend. Is the server running?' };
      }
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'An unexpected error occurred.' };
  }
}

/** GET /health — not available yet for binary responses */
export async function fetchBlob(path: string): Promise<ApiResponse<Blob>> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    }
    const blob = await res.blob();
    return { ok: true, data: blob };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Unexpected error fetching binary data.' };
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getBaseUrl: () => API_BASE_URL,
};

