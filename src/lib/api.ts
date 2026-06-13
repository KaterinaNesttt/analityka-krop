// Клієнт API: бере базовий URL з VITE_API_URL.
// Якщо змінна не задана — використовується відносний шлях, що зручно для self-host
// (фронтенд + Worker на одному домені) або для проксі через Pages Functions.

import {
  getCachedResponse,
  getOfflineQueue,
  removeOfflineQueueItem,
  saveCachedResponse,
  type OfflineQueueItem,
} from './offline-store';

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const DEFAULT_API_URL = import.meta.env.DEV ? '' : 'https://analityka-krop-api.roman-v-shkurenko.workers.dev';
const BASE_URL: string = configuredApiUrl || DEFAULT_API_URL;

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

export class ApiNetworkError extends Error {
  constructor(message = 'Мережа недоступна') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

interface ReqOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | Array<string | number> | undefined>;
  auth?: boolean;
}

let refreshing: Promise<boolean> | null = null;

export function getCurrentUserId(): string | null {
  const token = getAccess();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    const data = JSON.parse(json);
    return typeof data.sub === 'string' ? data.sub : null;
  } catch {
    return null;
  }
}

export function isNetworkError(e: unknown): boolean {
  return e instanceof ApiNetworkError || e instanceof TypeError || (e as any)?.message?.includes('Failed to fetch');
}

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
      if (res.status === 401 || res.status === 403) clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.access, data.refresh);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = any>(path: string, opts: ReqOpts = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = opts;
  const search = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== '' && item !== null) search.append(key, String(item));
        });
        return;
      }
      if (value !== undefined && value !== '' && value !== null) search.append(key, String(value));
    });
  }
  const queryString = search.toString();
  const qs = queryString ? `?${queryString}` : '';
  const url = `${BASE_URL}${path}${qs}`;
  const userId = auth ? getCurrentUserId() : null;
  const canCache = method === 'GET' && auth && !!userId;
  const cached = canCache ? await getCachedResponse(userId, url) : null;

  const run = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    if (auth) {
      const t = getAccess();
      if (t) headers['Authorization'] = `Bearer ${t}`;
    }
    try {
      return await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiNetworkError();
    }
  };

  let res: Response;
  try {
    res = await run();
  } catch (e) {
    if (canCache && cached) return cached.data as T;
    throw e;
  }
  if (res.status === 401 && auth && getRefresh()) {
    if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
    const ok = await refreshing;
    if (ok) {
      try {
        res = await run();
      } catch (e) {
        if (canCache && cached) return cached.data as T;
        throw e;
      }
    }
  }
  if (res.status === 304 && canCache && cached) {
    return cached.data as T;
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error ?? msg; } catch { msg = `HTTP ${res.status}`; }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json() as T;
  if (canCache) await saveCachedResponse(userId, url, res.headers.get('ETag'), data);
  return data;
}

export async function syncOfflineQueue(userId: string): Promise<number> {
  const rows = await getOfflineQueue(userId);
  let synced = 0;
  for (const item of rows) {
    try {
      await api(item.path, { method: item.method, body: item.body, query: item.query });
      await removeOfflineQueueItem(item.id);
      synced += 1;
    } catch (err: any) {
      const status = err.status || err.response?.status;
      if (status && status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 429) {
        await removeOfflineQueueItem(item.id);
        continue;
      }
      console.error('syncOfflineQueue item failed:', err);
      continue;
    }
  }
  return synced;
}

export type { OfflineQueueItem };
export const API_BASE = BASE_URL;
export const API_CONFIGURED = !!BASE_URL || true; // дозволяємо relative
