// Допоміжні утиліти: id, hashing, JWT, CORS, JSON-відповіді

import type { Env, JwtPayload } from './types';

export function uid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Password hashing (PBKDF2 + WebCrypto) ----------
const PBKDF2_ITERS = 100_000;

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERS}$${bytesToB64(salt)}$${bytesToB64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, itersStr, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;
  const iters = parseInt(itersStr, 10);
  const salt = b64ToBytes(saltB64);
  const expected = b64ToBytes(hashB64);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' },
      key,
      expected.length * 8,
    ),
  );
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

// ---------- HMAC-SHA256 hash for refresh tokens ----------
export async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- JWT (HS256) ----------
function b64urlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 === 2 ? '==' : input.length % 4 === 3 ? '=' : '';
  return b64ToBytes(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, ttlSec: number): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat, exp: iat + ttlSec };
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64urlEncode(JSON.stringify(full));
  const sig = b64urlEncode(await hmacSign(secret, `${header}.${body}`));
  return `${header}.${body}.${sig}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const expected = b64urlEncode(await hmacSign(secret, `${h}.${p}`));
  if (expected !== s) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as JwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- CORS / JSON helpers ----------
export function corsHeaders(env: Env, req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigins = [...env.ALLOWED_ORIGIN.split(',').map((o) => o.trim()), 'http://localhost:8080'];
  const allowed = env.ALLOWED_ORIGIN === '*' || allowedOrigins.includes(origin) ? (env.ALLOWED_ORIGIN === '*' ? '*' : origin) : env.ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
    'Access-Control-Expose-Headers': 'ETag',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(data: unknown, init: ResponseInit = {}, env?: Env, req?: Request): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (env && req) for (const [k, v] of Object.entries(corsHeaders(env, req))) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

function etagFor(entity: string, version: number, variant: string): string {
  let hash = 5381;
  for (let i = 0; i < variant.length; i++) hash = ((hash << 5) + hash) ^ variant.charCodeAt(i);
  return `W/"ak-${entity}-${version}-${(hash >>> 0).toString(36)}"`;
}

async function cacheVersion(env: Env, entity: string): Promise<number> {
  try {
    const row = await env.DB.prepare('SELECT version FROM cache_versions WHERE entity = ?').bind(entity).first<{ version: number }>();
    return row?.version ?? 1;
  } catch {
    return 1;
  }
}

async function cacheHeaders(entity: string, env: Env, req: Request, variant = ''): Promise<Headers> {
  const url = new URL(req.url);
  const sortedEntries = [...url.searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const canonicalQuery = new URLSearchParams(sortedEntries).toString();
  const headers = new Headers({
    ETag: etagFor(entity, await cacheVersion(env, entity), `${url.pathname}?${canonicalQuery}|${variant}`),
    'Cache-Control': 'private, no-cache',
  });
  return headers;
}

export async function notModified(entity: string, env: Env, req: Request, variant = ''): Promise<Response | null> {
  const headers = await cacheHeaders(entity, env, req, variant);
  if (req.headers.get('If-None-Match') === headers.get('ETag')) {
    if (env && req) for (const [k, v] of Object.entries(corsHeaders(env, req))) headers.set(k, v);
    return new Response(null, { status: 304, headers });
  }
  return null;
}

export async function cachedJson(entity: string, data: unknown, env: Env, req: Request, variant = ''): Promise<Response> {
  const headers = await cacheHeaders(entity, env, req, variant);
  return json(data, { headers }, env, req);
}

export async function touchCacheVersion(env: Env, entity: string): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO cache_versions (entity, version, updated_at)
       VALUES (?, 1, ?)
       ON CONFLICT(entity) DO UPDATE SET version = version + 1, updated_at = excluded.updated_at`
    ).bind(entity, nowIso()).run();
  } catch (err) {
    const logger = (env as any).logger || console;
    logger.error('touchCacheVersion failed', { entity, error: err });
    throw err;
  }
}

export function err(status: number, message: string, env: Env, req: Request): Response {
  return json({ error: message }, { status }, env, req);
}
