import type { Env } from './types';
import { json, err, uid, nowIso } from './utils';
import { requireApproved, requireRole } from './middleware';

const PUBLIC_FIELDS = `id, property_type, district, rooms, total_area,
  floor, floors_total, building_type, land_area, communications, amenities, condition, furniture, sale_term,
  initial_price, final_price, currency, sale_date, source_type, comment, status, created_at`;
const STAFF_FIELDS = PUBLIC_FIELDS + ', updated_at';

export interface SaleFilters {
  date_from?: string; date_to?: string; district?: string; property_type?: string;
  rooms?: number; area_min?: number; area_max?: number; price_min?: number; price_max?: number;
  currency?: string; condition?: string; floor_min?: number; floor_max?: number;
  source_type?: string; status?: string;
}

export function parseFilters(url: URL): SaleFilters {
  const f: SaleFilters = {};
  const p = url.searchParams;
  const get = (k: string) => p.get(k) ?? undefined;
  const num = (k: string) => { const v = p.get(k); return v ? Number(v) : undefined; };
  f.date_from = get('date_from'); f.date_to = get('date_to');
  f.district = get('district'); f.property_type = get('property_type');
  f.rooms = num('rooms'); f.area_min = num('area_min'); f.area_max = num('area_max');
  f.price_min = num('price_min'); f.price_max = num('price_max');
  f.currency = get('currency'); f.condition = get('condition');
  f.floor_min = num('floor_min'); f.floor_max = num('floor_max');
  f.source_type = get('source_type'); f.status = get('status');
  return f;
}

export function buildWhere(f: SaleFilters, forUser: boolean): { sql: string; params: any[] } {
  const w: string[] = []; const params: any[] = [];
  if (forUser) w.push("status = 'approved'");
  else if (f.status) { w.push('status = ?'); params.push(f.status); }
  if (f.date_from) { w.push('sale_date >= ?'); params.push(f.date_from); }
  if (f.date_to) { w.push('sale_date <= ?'); params.push(f.date_to); }
  if (f.district) { w.push('district = ?'); params.push(f.district); }
  if (f.property_type) { w.push('property_type = ?'); params.push(f.property_type); }
  if (f.rooms !== undefined) { w.push('rooms = ?'); params.push(f.rooms); }
  if (f.area_min !== undefined) { w.push('total_area >= ?'); params.push(f.area_min); }
  if (f.area_max !== undefined) { w.push('total_area <= ?'); params.push(f.area_max); }
  if (f.price_min !== undefined) { w.push('final_price >= ?'); params.push(f.price_min); }
  if (f.price_max !== undefined) { w.push('final_price <= ?'); params.push(f.price_max); }
  if (f.currency) { w.push('currency = ?'); params.push(f.currency); }
  if (f.condition) { w.push('condition = ?'); params.push(f.condition); }
  if (f.floor_min !== undefined) { w.push('floor >= ?'); params.push(f.floor_min); }
  if (f.floor_max !== undefined) { w.push('floor <= ?'); params.push(f.floor_max); }
  if (f.source_type) { w.push('source_type = ?'); params.push(f.source_type); }
  return { sql: w.length ? ' WHERE ' + w.join(' AND ') : '', params };
}

export async function listSales(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const forUser = u.role === 'user';
  const url = new URL(req.url);
  const filters = parseFilters(url);
  const { sql, params } = buildWhere(filters, forUser);
  const fields = forUser ? PUBLIC_FIELDS : STAFF_FIELDS;
  const sort = (url.searchParams.get('sort') ?? 'sale_date_desc');
  const sortMap: Record<string, string> = {
    sale_date_desc: 'sale_date DESC',
    sale_date_asc: 'sale_date ASC',
    price_desc: 'final_price DESC',
    price_asc: 'final_price ASC',
    area_desc: 'total_area DESC',
    area_asc: 'total_area ASC',
    district: 'district ASC, sale_date DESC',
  };
  const orderBy = sortMap[sort] ?? 'sale_date DESC';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10), 1000);
  const { results } = await env.DB.prepare(`SELECT ${fields} FROM sales${sql} ORDER BY ${orderBy} LIMIT ?`).bind(...params, limit).all();
  return json({ sales: results }, {}, env, req);
}

export async function getSale(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const forUser = u.role === 'user';
  const fields = forUser ? PUBLIC_FIELDS : STAFF_FIELDS;
  const row = await env.DB.prepare(`SELECT ${fields} FROM sales WHERE id = ?`).bind(id).first<any>();
  if (!row) return err(404, 'Не знайдено', env, req);
  if (forUser && row.status !== 'approved') return err(404, 'Не знайдено', env, req);
  const district = await env.DB.prepare(
    `SELECT AVG(final_price) AS avg_price,
            AVG(CASE WHEN total_area > 0 THEN final_price / total_area END) AS avg_price_per_m2
     FROM sales WHERE status = 'approved' AND district = ?`,
  ).bind(row.district).first<any>();
  const rooms = row.rooms == null
    ? { avg_price: null, avg_price_per_m2: null }
    : await env.DB.prepare(
      `SELECT AVG(final_price) AS avg_price,
              AVG(CASE WHEN total_area > 0 THEN final_price / total_area END) AS avg_price_per_m2
       FROM sales WHERE status = 'approved' AND rooms = ?`,
    ).bind(row.rooms).first<any>();
  return json({ sale: row, comparison: { district, rooms } }, {}, env, req);
}

export async function createSale(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const body = await req.json().catch(() => null) as any;
  if (!body) return err(400, 'Невірні дані', env, req);
  const required = ['property_type', 'district', 'final_price', 'currency', 'sale_date', 'source_type'];
  for (const k of required) if (body[k] === undefined || body[k] === null || body[k] === '') return err(400, `Поле "${k}" обовʼязкове`, env, req);
  const id = uid(); const now = nowIso();
  const finalPrice = Number(body.final_price);
  const initialPrice = body.initial_price ?? null;
  // staff can set status; user always pending
  let status = 'pending';
  if (u.role !== 'user' && ['pending', 'approved'].includes(body.status)) status = body.status;
  await env.DB.prepare(
    `INSERT INTO sales (id, property_type, district, rooms, total_area,
      floor, floors_total, building_type, land_area, communications, amenities, condition, furniture, sale_term,
      initial_price, final_price, currency, sale_date, source_type, comment, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.property_type, body.district, body.rooms ?? null, body.total_area == null ? null : Number(body.total_area),
    body.floor ?? null, body.floors_total ?? null, body.building_type ?? null,
    body.land_area ?? null, body.communications ?? null, body.amenities ?? null,
    body.condition ?? null, body.furniture ?? null, body.sale_term ?? null,
    initialPrice, finalPrice, body.currency, body.sale_date, body.source_type,
    body.comment ?? null, status, now, now,
  ).run();
  return json({ id, status, message: 'Дані відправлено на перевірку' }, { status: 201 }, env, req);
}

export async function updateSale(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ['admin', 'moderator']); if (u instanceof Response) return u;
  const body = await req.json().catch(() => null) as any;
  if (!body) return err(400, 'Невірні дані', env, req);
  const fields = ['property_type','district','rooms','total_area','floor','floors_total','building_type','land_area','communications','amenities','condition','furniture','sale_term','initial_price','final_price','currency','sale_date','source_type','comment'];
  const sets: string[] = []; const params: any[] = [];
  for (const f of fields) if (body[f] !== undefined) { sets.push(`${f} = ?`); params.push(body[f]); }
  if (!sets.length) return err(400, 'Немає полів для оновлення', env, req);
  sets.push('updated_at = ?'); params.push(nowIso());
  params.push(id);
  await env.DB.prepare(`UPDATE sales SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  return json({ ok: true }, {}, env, req);
}

export async function changeStatus(req: Request, env: Env, id: string, status: 'approved' | 'rejected' | 'duplicate'): Promise<Response> {
  const u = await requireRole(req, env, ['admin', 'moderator']); if (u instanceof Response) return u;
  const now = nowIso();
  await env.DB.prepare('UPDATE sales SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, now, id).run();
  return json({ ok: true, status }, {}, env, req);
}

export async function deleteSale(req: Request, env: Env, id: string): Promise<Response> {
  const u = await requireRole(req, env, ['admin']); if (u instanceof Response) return u;
  await env.DB.prepare('DELETE FROM sales WHERE id = ?').bind(id).run();
  return json({ ok: true }, {}, env, req);
}
