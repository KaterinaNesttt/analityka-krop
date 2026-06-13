import type { Env } from "./types";
import { cachedJson, json, err, nowIso, uid, notModified, touchCacheVersion } from "./utils";
import { requireRole } from "./middleware";

export async function listUsers(req: Request, env: Env): Promise<Response> {
  const u = await requireRole(req, env, ["admin"]);
  if (u instanceof Response) return u;
  const cached = await notModified("users", env, req, u.role);
  if (cached) return cached;
  const { results } = await env.DB.prepare(
    "SELECT id, email, name, role, status, created_at, last_login_at FROM users ORDER BY created_at DESC",
  ).all();
  return cachedJson("users", { users: results }, env, req, u.role);
}

export async function approveUser(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ["admin"]);
  if (u instanceof Response) return u;
  const result = await env.DB.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?")
    .bind("approved", nowIso(), id)
    .run();
  if (!Number((result.meta as { changes?: number }).changes ?? 0))
    return err(404, "Користувача не знайдено", env, req);
  await audit(env, u.id, "user.approve", "user", id);
  await touchCacheVersion(env, "users");
  return json({ ok: true }, {}, env, req);
}

export async function setRole(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ["admin"]);
  if (u instanceof Response) return u;
  const body = (await req.json().catch(() => null)) as any;
  const role = body?.role;
  if (!["superuser", "admin", "moderator", "user"].includes(role))
    return err(400, "Невірна роль", env, req);
  const target = await env.DB.prepare("SELECT role FROM users WHERE id = ?")
    .bind(id)
    .first<{ role: string }>();
  if (!target) return err(404, "Користувача не знайдено", env, req);
  if ((role === "superuser" || target.role === "superuser") && u.role !== "superuser")
    return err(403, "Недостатньо прав", env, req);
  const result = await env.DB.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
    .bind(role, nowIso(), id)
    .run();
  if (!Number((result.meta as { changes?: number }).changes ?? 0))
    return err(404, "Користувача не знайдено", env, req);
  await audit(env, u.id, "user.role", "user", id, JSON.stringify({ role }));
  await touchCacheVersion(env, "users");
  return json({ ok: true }, {}, env, req);
}

export async function blockUser(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ["admin"]);
  if (u instanceof Response) return u;
  const target = await env.DB.prepare("SELECT role FROM users WHERE id = ?")
    .bind(id)
    .first<{ role: string }>();
  if (!target) return err(404, "Користувача не знайдено", env, req);
  if (target.role === "superuser" && u.role !== "superuser")
    return err(403, "Недостатньо прав", env, req);
  const body = (await req.json().catch(() => ({}))) as any;
  const status = body?.unblock ? "approved" : "blocked";
  const result = await env.DB.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, nowIso(), id)
    .run();
  if (!Number((result.meta as { changes?: number }).changes ?? 0))
    return err(404, "Користувача не знайдено", env, req);
  await audit(env, u.id, status === "blocked" ? "user.block" : "user.unblock", "user", id);
  await touchCacheVersion(env, "users");
  return json({ ok: true, status }, {}, env, req);
}

async function audit(
  env: Env,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: string,
) {
  await env.DB.prepare(
    "INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(uid(), userId, action, entityType, entityId, details ?? null, nowIso())
    .run();
}
