import { ws } from '../window-api';

// Vite injects VITE_* values at build time from .env.production / .env.development.
// Defaults are LOCAL on purpose — real URLs live only in env config.
const API_BASE =
  (import.meta.env.VITE_WORKSIGHT_API as string | undefined) ??
  'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  noAuth?: boolean;
}

export const api = async <T>(path: string, opts: RequestOpts = {}): Promise<T> => {
  const token = !opts.noAuth ? await ws().auth.getToken() : null;
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: { success: boolean; data?: T; error?: string } | null = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok || !json || json.success === false) {
    if (res.status === 401) await ws().auth.clearToken();
    throw new ApiError(json?.error ?? `Request failed (${res.status})`, res.status);
  }
  return json.data as T;
};
