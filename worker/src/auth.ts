import type { Env } from './types';
import { json, err, uid, nowIso, hashPassword, verifyPassword, signJwt, hmacSha256Hex } from './utils';
import { getAuth } from './middleware';

const ACCESS_TTL = 60 * 15; // 15 хв
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 днів

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function issueTokens(env: Env, userId: string, role: string, status: string) {
  const access = await signJwt({ sub: userId, role: role as any, status: status as any }, env.JWT_SECRET, ACCESS_TTL);
  const refreshRaw = `${userId}.${crypto.randomUUID()}.${Date.now()}`;
  const refresh = await signJwt({ sub: userId, role: role as any, status: status as any }, env.JWT_REFRESH_SECRET, REFRESH_TTL);
  const tokenHash = await hmacSha256Hex(env.JWT_REFRESH_SECRET, refresh);
  await env.DB.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(uid(), userId, tokenHash, new Date(Date.now() + REFRESH_TTL * 1000).toISOString(), nowIso())
    .run();
  return { access, refresh };
}

export async function register(req: Request, env: Env): Promise<Response> {
  const body = await req.json().catch(() => null) as any;
  if (!body || !isEmail(body.email) || typeof body.password !== 'string' || body.password.length < 8) {
    return err(400, 'Невірний email або пароль (мін. 8 символів)', env, req);
  }
  const email = String(body.email).toLowerCase().trim();
  const name = body.name ? String(body.name).trim().slice(0, 100) : null;
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return err(409, 'Користувач з таким email вже існує', env, req);

  // Перший користувач отримує admin+approved автоматично (bootstrap)
  const { count } = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>() ?? { count: 0 };
  const isFirst = count === 0;
  const role = isFirst ? 'admin' : 'user';
  const status = isFirst ? 'approved' : 'pending';

  const id = uid();
  const ph = await hashPassword(body.password);
  const now = nowIso();
  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, email, ph, name, role, status, now, now)
    .run();
  return json({ id, email, role, status, name, message: isFirst ? 'Створено першого адміністратора' : 'Заявку відправлено. Очікуйте підтвердження адміністратором.' }, { status: 201 }, env, req);
}

export async function login(req: Request, env: Env): Promise<Response> {
  const body = await req.json().catch(() => null) as any;
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return err(400, 'Невірні дані', env, req);
  }
  const email = body.email.toLowerCase().trim();
  const row = await env.DB.prepare(
    'SELECT id, email, password_hash, role, status, name FROM users WHERE email = ?',
  )
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; role: string; status: string; name: string | null }>();
  if (!row) return err(401, 'Невірний email або пароль', env, req);
  const ok = await verifyPassword(body.password, row.password_hash);
  if (!ok) return err(401, 'Невірний email або пароль', env, req);
  if (row.status === 'blocked') return err(403, 'Акаунт заблоковано', env, req);
  await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), row.id).run();
  const tokens = await issueTokens(env, row.id, row.role, row.status);
  return json({
    ...tokens,
    user: { id: row.id, email: row.email, name: row.name, role: row.role, status: row.status },
  }, {}, env, req);
}

export async function refresh(req: Request, env: Env): Promise<Response> {
  const body = await req.json().catch(() => null) as any;
  const token = body?.refresh;
  if (!token || typeof token !== 'string') return err(400, 'Відсутній refresh', env, req);
  const { verifyJwt } = await import('./utils');
  const payload = await verifyJwt(token, env.JWT_REFRESH_SECRET);
  if (!payload) return err(401, 'Невірний refresh', env, req);
  const tokenHash = await hmacSha256Hex(env.JWT_REFRESH_SECRET, token);
  const stored = await env.DB.prepare(
    'SELECT id, revoked_at FROM refresh_tokens WHERE token_hash = ? AND user_id = ?',
  )
    .bind(tokenHash, payload.sub)
    .first<{ id: string; revoked_at: string | null }>();
  if (!stored || stored.revoked_at) return err(401, 'Refresh відкликано', env, req);
  const user = await env.DB.prepare('SELECT id, role, status FROM users WHERE id = ?').bind(payload.sub).first<{ id: string; role: string; status: string }>();
  if (!user || user.status === 'blocked') return err(403, 'Доступ заборонено', env, req);
  // rotate
  await env.DB.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?').bind(nowIso(), stored.id).run();
  const tokens = await issueTokens(env, user.id, user.role, user.status);
  return json(tokens, {}, env, req);
}

export async function logout(req: Request, env: Env): Promise<Response> {
  const body = await req.json().catch(() => null) as any;
  const token = body?.refresh;
  if (token) {
    const tokenHash = await hmacSha256Hex(env.JWT_REFRESH_SECRET, token);
    await env.DB.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').bind(nowIso(), tokenHash).run();
  }
  return json({ ok: true }, {}, env, req);
}

export async function me(req: Request, env: Env): Promise<Response> {
  const u = await getAuth(req, env);
  if (!u) return err(401, 'Не авторизовано', env, req);
  return json({ user: u }, {}, env, req);
}
