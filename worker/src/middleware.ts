import type { Env, AuthUser, Role } from './types';
import { verifyJwt, err } from './utils';

export async function getAuth(req: Request, env: Env): Promise<AuthUser | null> {
  const h = req.headers.get('Authorization');
  if (!h || !h.startsWith('Bearer ')) return null;
  const token = h.slice(7);
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) return null;
  const row = await env.DB.prepare('SELECT id, email, name, role, status FROM users WHERE id = ?')
    .bind(payload.sub)
    .first<AuthUser>();
  return row ?? null;
}

export async function requireAuth(req: Request, env: Env): Promise<AuthUser | Response> {
  const u = await getAuth(req, env);
  if (!u) return err(401, 'Не авторизовано', env, req);
  if (u.status === 'blocked') return err(403, 'Акаунт заблоковано', env, req);
  return u;
}

export async function requireApproved(req: Request, env: Env): Promise<AuthUser | Response> {
  const u = await requireAuth(req, env);
  if (u instanceof Response) return u;
  if (u.status !== 'approved') return err(403, 'Акаунт очікує підтвердження', env, req);
  return u;
}

export async function requireRole(req: Request, env: Env, roles: Role[]): Promise<AuthUser | Response> {
  const u = await requireApproved(req, env);
  if (u instanceof Response) return u;
  if (u.role === 'superuser') return u;
  if (!roles.includes(u.role)) return err(403, 'Недостатньо прав', env, req);
  return u;
}
