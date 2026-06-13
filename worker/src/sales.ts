import type { Env } from './types';
import { cachedJson, json, err, uid, nowIso, notModified, touchCacheVersion } from './utils';
import { requireApproved, requireRole } from './middleware';


  const PUBLIC_FIELDS = `id, property_type, district, rooms, total_area,
    floor, floors_total, building_type, land_area, communications, amenities, condition, furniture, sale_term,
    initial_price, final_price, currency, sale_date, source_type, comment, status, created_at`;
const STAFF_FIELDS = PUBLIC_FIELDS + ', updated_at';

export interface SaleFilters {
  district?: string; districts?: string[]; price_min?: number; price_max?: number; status?: string;
  floor?: string; rooms?: string; property_type?: string; sale_term?: string; condition?: string; furniture?: string;
}

export function parseFilters(url: URL): SaleFilters {
  const f: SaleFilters = {};
  const p = url.searchParams;
  const get = (k: string) => p.get(k) ?? undefined;
  const num = (k: string) => { const v = p.get(k); return v ? Number(v) : undefined; };
  f.district = get('district');
  f.districts = [...p.getAll('districts'), ...p.getAll('districts[]')].map((v) => v.trim()).filter(Boolean);
  f.price_min = num('price_min'); f.price_max = num('price_max');
  f.status = get('status');
  f.floor = get('floor');
  f.rooms = get('rooms');
  f.property_type = get('property_type');
  f.sale_term = get('sale_term');
  f.condition = get('condition');
  f.furniture = get('furniture');
  return f;
}

export function buildWhere(f: SaleFilters, forUser: boolean): { sql: string; params: any[] } {
  const w: string[] = []; const params: any[] = [];
  if (forUser) w.push("status = 'approved'");
  else if (f.status) { w.push('status = ?'); params.push(f.status); }
  if (f.districts?.length) { w.push(`district IN (${f.districts.map(() => '?').join(', ')})`); params.push(...f.districts); }
  else if (f.district) { w.push('district = ?'); params.push(f.district); }
  if (f.price_min !== undefined) { w.push('final_price >= ?'); params.push(f.price_min); }
  if (f.price_max !== undefined) { w.push('final_price <= ?'); params.push(f.price_max); }
  if (f.floor) { w.push('floor = ?'); params.push(f.floor); }
  if (f.rooms) { w.push('rooms = ?'); params.push(f.rooms); }
  if (f.property_type) { w.push('property_type = ?'); params.push(f.property_type); }
  if (f.sale_term) { w.push('sale_term = ?'); params.push(f.sale_term); }
  if (f.condition) { w.push('condition = ?'); params.push(f.condition); }
  if (f.furniture) { w.push('furniture = ?'); params.push(f.furniture); }
  return { sql: w.length ? ' WHERE ' + w.join(' AND ') : '', params };
}

function clean(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function money(v: unknown): number | null {
  const s = clean(v);
  if (!s) return null;
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export async function listSales(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const cached = await notModified('sales', env, req, u.role); if (cached) return cached;
  const forUser = u.role === 'user';
  const url = new URL(req.url);
  const filters = parseFilters(url);
  const { sql, params } = buildWhere(filters, forUser);
  const fields = forUser ? PUBLIC_FIELDS : STAFF_FIELDS;
  const sort = (url.searchParams.get('sort') ?? 'created_at_desc');
  const sortMap: Record<string, string> = {
    created_at_desc: 'created_at DESC',
    created_at_asc: 'created_at ASC',
    price_desc: 'final_price DESC',
    price_asc: 'final_price ASC',
    district: 'district ASC, created_at DESC',
  };
  const orderBy = sortMap[sort] ?? 'created_at DESC';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10), 1000);
  const { results } = await env.DB.prepare(`SELECT ${fields} FROM sales${sql} ORDER BY ${orderBy} LIMIT ?`).bind(...params, limit).all();
  return cachedJson('sales', { sales: results }, env, req, u.role);
}

export async function getSale(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const cached = await notModified('sales', env, req, u.role); if (cached) return cached;
  const forUser = u.role === 'user';
  const fields = forUser ? PUBLIC_FIELDS : STAFF_FIELDS;
  const row = await env.DB.prepare(`SELECT ${fields} FROM sales WHERE id = ?`).bind(id).first<any>();
  if (!row) return err(404, 'Не знайдено', env, req);
  if (forUser && row.status !== 'approved') return err(404, 'Не знайдено', env, req);
  return cachedJson('sales', { sale: row }, env, req, u.role);
}

export async function createSale(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const body = await req.json().catch(() => null) as any;
  if (!body) return err(400, 'Невірні дані', env, req);
  const required = ['district'];
  for (const k of required) if (body[k] === undefined || body[k] === null || body[k] === '') return err(400, `Поле "${k}" обовʼязкове`, env, req);
  const id = uid(); const now = nowIso();
  const finalPrice = money(body.final_price);
  const initialPrice = money(body.initial_price);
  // staff can set status; user always pending
  let status = 'pending';
  if (u.role !== 'user' && ['pending', 'approved'].includes(body.status)) status = body.status;
  await env.DB.prepare(
    `INSERT INTO sales (id, district, floor, characteristics, sale_term,
      initial_price, final_price, comment, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, clean(body.district), clean(body.floor), clean(body.characteristics), clean(body.sale_term),
    initialPrice, finalPrice, clean(body.comment), status, now, now,
  ).run();
  await touchCacheVersion(env, 'sales');
  return json({ id, status, message: 'Дані відправлено на перевірку' }, { status: 201 }, env, req);
}

export async function updateSale(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ['admin', 'moderator']); if (u instanceof Response) return u;
  const body = await req.json().catch(() => null) as any;
  if (!body) return err(400, 'Невірні дані', env, req);
  const fields = ['district','floor','characteristics','sale_term','initial_price','final_price','comment'];
  const sets: string[] = []; const params: any[] = [];
  for (const f of fields) if (body[f] !== undefined) {
    sets.push(`${f} = ?`);
    params.push(f === 'initial_price' || f === 'final_price' ? money(body[f]) : clean(body[f]));
  }
  if (!sets.length) return err(400, 'Немає полів для оновлення', env, req);
  sets.push('updated_at = ?'); params.push(nowIso());
  params.push(id);
  await env.DB.prepare(`UPDATE sales SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  await touchCacheVersion(env, 'sales');
  return json({ ok: true }, {}, env, req);
}

export async function changeStatus(req: Request, env: Env, id: string, status: 'approved' | 'rejected' | 'duplicate'): Promise<Response> {
  const u = await requireRole(req, env, ['admin', 'moderator']); if (u instanceof Response) return u;
  const now = nowIso();
  await env.DB.prepare('UPDATE sales SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, now, id).run();
  await touchCacheVersion(env, 'sales');
  return json({ ok: true, status }, {}, env, req);
}

export async function deleteSale(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ['admin']); if (u instanceof Response) return u;
  await env.DB.prepare('DELETE FROM sales WHERE id = ?').bind(id).run();
  await touchCacheVersion(env, 'sales');
  return json({ ok: true }, {}, env, req);
}
