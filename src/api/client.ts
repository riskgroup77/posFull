const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem('pos_access_token');
}

export function setTokens(access: string, refresh?: string) {
  localStorage.setItem('pos_access_token', access);
  if (refresh) localStorage.setItem('pos_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('pos_access_token');
  localStorage.removeItem('pos_refresh_token');
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem('pos_refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, options, false);
    clearTokens();
    throw new ApiError('Sessiya tugadi. Qayta kiring.', 401);
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      const detail = err.detail;
      message = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.join(', ') : `HTTP ${res.status}`);
    } catch {
      message = await res.text();
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
