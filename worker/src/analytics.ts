import type { Env } from './types';
import { json } from './utils';
import { requireApproved } from './middleware';
import { parseFilters, buildWhere } from './sales';

function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function avg(arr: number[]): number | null { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }

async function fetchSales(req: Request, env: Env) {
  const url = new URL(req.url);
  const f = parseFilters(url);
  const { sql, params } = buildWhere(f, true); // analytics always uses approved
  const { results } = await env.DB.prepare(
    `SELECT property_type, district, rooms, total_area, final_price, currency, initial_price,
            discount_percent, sale_date FROM sales${sql}`,
  ).bind(...params).all<any>();
  return results;
}

export async function summary(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const prices = rows.map((r: any) => Number(r.final_price));
  const ppm = rows.filter((r: any) => r.total_area > 0).map((r: any) => Number(r.final_price) / Number(r.total_area));
  const since = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const last30 = rows.filter((r: any) => r.sale_date >= since).length;
  const districtCounts: Record<string, number> = {};
  for (const r of rows) districtCounts[r.district] = (districtCounts[r.district] ?? 0) + 1;
  const topDistricts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ district: k, count: v }));
  const roomCounts: Record<string, number> = {};
  for (const r of rows) if (r.rooms) roomCounts[r.rooms] = (roomCounts[r.rooms] ?? 0) + 1;
  const topRooms = Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0];
  const discounts = rows.filter((r: any) => r.discount_percent != null).map((r: any) => Number(r.discount_percent));
  return json({
    total: rows.length,
    avg_price: avg(prices),
    median_price: median(prices),
    avg_price_per_m2: avg(ppm),
    last_30_days: last30,
    top_districts: topDistricts,
    top_rooms: topRooms ? Number(topRooms[0]) : null,
    avg_discount_percent: avg(discounts),
  }, {}, env, req);
}

export async function priceDynamics(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const m: Record<string, number[]> = {};
  for (const r of rows) {
    const k = r.sale_date.slice(0, 7);
    (m[k] ??= []).push(Number(r.final_price));
  }
  const data = Object.entries(m).sort().map(([month, arr]) => ({ month, avg_price: avg(arr), median_price: median(arr), count: arr.length }));
  return json({ data }, {}, env, req);
}

export async function pricePerM2(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const m: Record<string, number[]> = {};
  for (const r of rows) {
    if (!r.total_area) continue;
    const k = r.sale_date.slice(0, 7);
    (m[k] ??= []).push(Number(r.final_price) / Number(r.total_area));
  }
  const data = Object.entries(m).sort().map(([month, arr]) => ({ month, avg_price_per_m2: avg(arr), count: arr.length }));
  return json({ data }, {}, env, req);
}

export async function byDistrict(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const m: Record<string, number[]> = {};
  const p: Record<string, number[]> = {};
  for (const r of rows) {
    (m[r.district] ??= []).push(Number(r.final_price));
    if (r.total_area) (p[r.district] ??= []).push(Number(r.final_price) / Number(r.total_area));
  }
  const data = Object.keys(m).map((d) => ({ district: d, count: m[d].length, avg_price: avg(m[d]), avg_price_per_m2: avg(p[d] ?? []) }));
  return json({ data }, {}, env, req);
}

export async function byRooms(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const m: Record<string, number[]> = {};
  const p: Record<string, number[]> = {};
  for (const r of rows) {
    const k = r.rooms ?? 0;
    (m[k] ??= []).push(Number(r.final_price));
    if (r.total_area) (p[k] ??= []).push(Number(r.final_price) / Number(r.total_area));
  }
  const data = Object.keys(m).sort().map((k) => ({ rooms: Number(k), count: m[k].length, avg_price: avg(m[k]), avg_price_per_m2: avg(p[k] ?? []) }));
  return json({ data }, {}, env, req);
}

export async function discounts(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const ds = rows.filter((r: any) => r.discount_percent != null).map((r: any) => Number(r.discount_percent));
  const buckets = [0, 2, 5, 10, 15, 100];
  const labels = ['0-2%', '2-5%', '5-10%', '10-15%', '15%+'];
  const counts = labels.map(() => 0);
  for (const d of ds) {
    for (let i = 0; i < buckets.length - 1; i++) if (d >= buckets[i] && d < buckets[i + 1]) { counts[i]++; break; }
  }
  return json({ avg: avg(ds), median: median(ds), distribution: labels.map((l, i) => ({ bucket: l, count: counts[i] })) }, {}, env, req);
}

export async function comparison(req: Request, env: Env): Promise<Response> {
  return byDistrict(req, env);
}

export async function distribution(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const prices = rows.map((r: any) => Number(r.final_price));
  if (!prices.length) return json({ data: [] }, {}, env, req);
  const min = Math.min(...prices); const max = Math.max(...prices);
  const buckets = 8;
  const step = (max - min) / buckets || 1;
  const data: { range: string; count: number }[] = [];
  for (let i = 0; i < buckets; i++) {
    const lo = min + step * i; const hi = min + step * (i + 1);
    data.push({ range: `${Math.round(lo)}–${Math.round(hi)}`, count: prices.filter((p) => p >= lo && (i === buckets - 1 ? p <= hi : p < hi)).length });
  }
  return json({ data }, {}, env, req);
}
