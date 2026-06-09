import type { Env } from './types';
import { json, err, nowIso, uid } from './utils';
import { requireRole } from './middleware';

export async function listUsers(req: Request, env: Env): Promise<Response> {
  const u = await requireRole(req, env, ['admin']);
  if (u instanceof Response) return u;
  const { results } = await env.DB.prepare(
    'SELECT id, email, name, role, status, created_at, last_login_at FROM users ORDER BY created_at DESC',
  ).all();
  return json({ users: results }, {}, env, req);
}

export async function approveUser(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ['admin']);
  if (u instanceof Response) return u;
  await env.DB.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').bind('approved', nowIso(), id).run();
  await audit(env, u.id, 'user.approve', 'user', id);
  return json({ ok: true }, {}, env, req);
}

export async function setRole(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ['admin']);
  if (u instanceof Response) return u;
  const body = await req.json().catch(() => null) as any;
  const role = body?.role;
  if (!['admin', 'moderator', 'user'].includes(role)) return err(400, 'Невірна роль', env, req);
  await env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, nowIso(), id).run();
  await audit(env, u.id, 'user.role', 'user', id, JSON.stringify({ role }));
  return json({ ok: true }, {}, env, req);
}

export async function blockUser(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ['admin']);
  if (u instanceof Response) return u;
  const body = await req.json().catch(() => ({})) as any;
  const status = body?.unblock ? 'approved' : 'blocked';
  await env.DB.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').bind(status, nowIso(), id).run();
  await audit(env, u.id, status === 'blocked' ? 'user.block' : 'user.unblock', 'user', id);
  return json({ ok: true, status }, {}, env, req);
}

async function audit(env: Env, userId: string, action: string, entityType: string, entityId: string, details?: string) {
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(uid(), userId, action, entityType, entityId, details ?? null, nowIso())
    .run();
}
