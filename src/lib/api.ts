// Клієнт API: бере базовий URL з VITE_API_URL.
// Якщо змінна не задана — використовується відносний шлях, що зручно для self-host
// (фронтенд + Worker на одному домені) або для проксі через Pages Functions.

const BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

const ACCESS_KEY = 'ak.access';
const REFRESH_KEY = 'ak.refresh';

export function getAccess(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefresh(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ReqOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const rt = getRefresh();
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: rt }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function api<T = any>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = opts;
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = `${BASE_URL}${path}${qs}`;

  const run = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (auth) {
      const t = getAccess();
      if (t) headers['Authorization'] = `Bearer ${t}`;
    }
    return fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  };

  let res = await run();
  if (res.status === 401 && auth && getRefresh()) {
    if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
    const ok = await refreshing;
    if (ok) res = await run();
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error ?? msg; } catch { msg = `HTTP ${res.status}`; }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const API_BASE = BASE_URL;
export const API_CONFIGURED = !!BASE_URL || true; // дозволяємо relative
