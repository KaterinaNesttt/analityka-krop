type CachedResponse = {
  key: string;
  userId: string;
  url: string;
  etag: string | null;
  data: unknown;
  updatedAt: number;
};

export type OfflineQueueItem = {
  id: string;
  userId: string;
  path: string;
  method: 'POST';
  body: unknown;
  query?: Record<string, string | number | Array<string | number> | undefined>;
  label: string;
  createdAt: number;
};

const DB_NAME = 'ak-offline';
const DB_VERSION = 1;
const CACHE_STORE = 'responses';
const QUEUE_STORE = 'queue';
const AUTH_USER_PREFIX = 'ak.auth.user.';

let dbPromise: Promise<IDBDatabase> | null = null;
const queueListeners = new Set<() => void>();

function canUseIndexedDb(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) return Promise.reject(new Error('IndexedDB unavailable'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function store<T>(name: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const req = run(tx.objectStore(name));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export function responseCacheKey(userId: string, url: string): string {
  return `${userId}:GET:${url}`;
}

export async function getCachedResponse(userId: string, url: string): Promise<CachedResponse | null> {
  try {
    return await store<CachedResponse | undefined>(CACHE_STORE, 'readonly', (s) => s.get(responseCacheKey(userId, url))) ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedResponse(userId: string, url: string, etag: string | null, data: unknown): Promise<void> {
  try {
    await store<IDBValidKey>(CACHE_STORE, 'readwrite', (s) =>
      s.put({ key: responseCacheKey(userId, url), userId, url, etag, data, updatedAt: Date.now() }),
    );
  } catch {}
}

export function saveCachedUser(userId: string, user: unknown): void {
  try {
    localStorage.setItem(`${AUTH_USER_PREFIX}${userId}`, JSON.stringify(user));
  } catch {}
}

export function getCachedUser<T>(userId: string): T | null {
  try {
    const raw = localStorage.getItem(`${AUTH_USER_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export async function clearOfflineDataForUser(userId: string): Promise<void> {
  try {
    localStorage.removeItem(`${AUTH_USER_PREFIX}${userId}`);
  } catch {}
  if (!canUseIndexedDb()) return;
  try {
    const db = await openDb();
    await Promise.all([clearMatching(db, CACHE_STORE, userId), clearMatching(db, QUEUE_STORE, userId)]);
    emitQueueChange();
  } catch {}
}

function clearMatching(db: IDBDatabase, name: string, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const objectStore = tx.objectStore(name);
    const cursor = objectStore.openCursor();
    cursor.onsuccess = () => {
      const current = cursor.result;
      if (!current) return;
      if ((current.value as { userId?: string }).userId === userId) current.delete();
      current.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function enqueueOfflineRequest(item: Omit<OfflineQueueItem, 'id' | 'createdAt'>): Promise<OfflineQueueItem> {
  const queued: OfflineQueueItem = {
    ...item,
    id: `${Date.now()}-${crypto.randomUUID()}`,
    createdAt: Date.now(),
  };
  await store<IDBValidKey>(QUEUE_STORE, 'readwrite', (s) => s.put(queued));
  emitQueueChange();
  return queued;
}

export async function getOfflineQueue(userId: string): Promise<OfflineQueueItem[]> {
  try {
    const rows = await store<OfflineQueueItem[]>(QUEUE_STORE, 'readonly', (s) => s.getAll());
    return rows.filter((item) => item.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function removeOfflineQueueItem(id: string): Promise<void> {
  try {
    await store<undefined>(QUEUE_STORE, 'readwrite', (s) => s.delete(id));
    emitQueueChange();
  } catch {}
}

export function subscribeOfflineQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

export function emitQueueChange(): void {
  queueListeners.forEach((listener) => listener());
}

