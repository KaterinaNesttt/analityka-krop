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
    `SELECT district, floor, characteristics, sale_term, initial_price, final_price,
            comment, status, created_at FROM sales${sql}`,
  ).bind(...params).all<any>();
  return results;
}

export async function summary(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const prices = rows.map((r: any) => Number(r.final_price)).filter(Number.isFinite);
  const districtCounts: Record<string, number> = {};
  for (const r of rows) districtCounts[r.district] = (districtCounts[r.district] ?? 0) + 1;
  const topDistricts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ district: k, count: v }));
  const withFinalPrice = prices.length;
  const discounts = rows
    .filter((r: any) => r.initial_price != null && Number(r.initial_price) > 0 && Number.isFinite(Number(r.final_price)))
    .map((r: any) => ((Number(r.initial_price) - Number(r.final_price)) / Number(r.initial_price)) * 100);
  return json({
    total: rows.length,
    avg_price: avg(prices),
    median_price: median(prices),
    with_final_price: withFinalPrice,
    without_final_price: rows.length - withFinalPrice,
    top_districts: topDistricts,
    avg_discount_percent: avg(discounts),
  }, {}, env, req);
}

export async function priceDynamics(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const m: Record<string, number[]> = {};
  for (const r of rows) {
    if (!Number.isFinite(Number(r.final_price))) continue;
    const k = r.created_at.slice(0, 7);
    (m[k] ??= []).push(Number(r.final_price));
  }
  const data = Object.entries(m).sort().map(([month, arr]) => ({ month, avg_price: avg(arr), median_price: median(arr), count: arr.length }));
  return json({ data }, {}, env, req);
}

export async function pricePerM2(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  return json({ data: [] }, {}, env, req);
}

export async function byDistrict(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const m: Record<string, number[]> = {};
  for (const r of rows) {
    if (!Number.isFinite(Number(r.final_price))) continue;
    (m[r.district] ??= []).push(Number(r.final_price));
  }
  const data = Object.keys(m).map((d) => ({ district: d, count: m[d].length, avg_price: avg(m[d]) }));
  return json({ data }, {}, env, req);
}

export async function byFloors(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const data = Object.entries(rows.reduce<Record<string, number>>((acc: Record<string, number>, r: any) => {
    if (r.floor) acc[r.floor] = (acc[r.floor] ?? 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).map(([floor, count]) => ({ floor, count }));
  return json({ data }, {}, env, req);
}

export async function discounts(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const rows = await fetchSales(req, env);
  const ds = rows
    .filter((r: any) => r.initial_price != null && Number(r.initial_price) > 0 && Number.isFinite(Number(r.final_price)))
    .map((r: any) => ((Number(r.initial_price) - Number(r.final_price)) / Number(r.initial_price)) * 100);
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
  const prices = rows.map((r: any) => Number(r.final_price)).filter(Number.isFinite);
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
