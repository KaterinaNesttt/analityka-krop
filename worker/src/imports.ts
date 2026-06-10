import type { Env } from './types';
import { json, err, uid, nowIso } from './utils';
import { requireApproved, requireRole } from './middleware';

// Простий парсер тексту з Telegram. Витягує очевидні поля.
export function parseTelegramText(text: string): Record<string, any> {
  const out: Record<string, any> = {};
  const lc = text.toLowerCase();

  // Кімнати: "1-к", "2 кімн", "3к"
  const rooms = lc.match(/(\d)\s*[-–]?\s*(?:к(?:імн)?|кімната|кімнатн)/);
  if (rooms) out.rooms = Number(rooms[1]);

  // Площа: "54 м²", "54 кв"
  const area = lc.match(/(\d{2,3}(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м|кв)/);
  if (area) out.total_area = Number(area[1].replace(',', '.'));

  // Поверх: "3/9", "3 поверх"
  const fl = lc.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (fl) { out.floor = Number(fl[1]); out.floors_total = Number(fl[2]); }

  // Ціна + валюта
  const priceUsd = text.match(/(\d[\d\s]{2,})\s*\$|\$\s*(\d[\d\s]{2,})|(\d[\d\s]{2,})\s*usd/i);
  const priceUah = text.match(/(\d[\d\s]{4,})\s*(?:грн|uah|₴)/i);
  const priceEur = text.match(/(\d[\d\s]{2,})\s*(?:€|eur)/i);
  if (priceUsd) { out.final_price = Number((priceUsd[1] || priceUsd[2] || priceUsd[3]).replace(/\s/g, '')); out.currency = 'USD'; }
  else if (priceEur) { out.final_price = Number(priceEur[1].replace(/\s/g, '')); out.currency = 'EUR'; }
  else if (priceUah) { out.final_price = Number(priceUah[1].replace(/\s/g, '')); out.currency = 'UAH'; }

  // Район
  const districts = ['Центр', 'Фортечний', 'Подільський', 'Новомиколаївка', 'Лелеківка', 'Завадівка', 'Балка'];
  for (const d of districts) if (text.toLowerCase().includes(d.toLowerCase())) { out.district = d; break; }

  // Тип
  if (/будин|дім|приватн/i.test(text)) out.property_type = 'house';
  else if (/комерц/i.test(text)) out.property_type = 'commercial';
  else out.property_type = 'apartment';

  // Стан
  if (/євроремонт|euro/i.test(text)) out.condition = 'євроремонт';
  else if (/після ремонт|косметичн/i.test(text)) out.condition = 'після ремонту';
  else if (/житлов/i.test(text)) out.condition = 'житловий стан';

  // Дата (DD.MM.YYYY або YYYY-MM-DD)
  const d1 = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const d2 = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (d2) out.sale_date = `${d2[1]}-${d2[2]}-${d2[3]}`;
  else if (d1) out.sale_date = `${d1[3]}-${d1[2].padStart(2, '0')}-${d1[1].padStart(2, '0')}`;
  else out.sale_date = new Date().toISOString().slice(0, 10);

  out.source_type = 'telegram';
  out.source_text = text;
  return out;
}

export async function parseTelegram(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const body = await req.json().catch(() => null) as any;
  if (!body?.text || typeof body.text !== 'string') return err(400, 'Відсутній текст', env, req);
  const parsed = parseTelegramText(body.text);
  return json({ parsed }, {}, env, req);
}

// CSV: рядки з мапінгом колонок
function clean(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function num(v: unknown): number | null {
  const s = clean(v);
  if (!s) return null;
  const m = s.replace(/\s/g, '').replace(',', '.').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function rooms(v: unknown): number | null {
  const s = clean(v);
  if (!s) return null;
  const byK = s.match(/(\d+)\s*к/i);
  if (byK) return Number(byK[1]);
  const first = s.match(/\d+/);
  return first ? Number(first[0]) : null;
}

function areaFromText(...values: unknown[]): number | null {
  const text = values.map((v) => clean(v)).filter(Boolean).join(' ');
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:м2|м²|кв\.?\s*м)/gi)];
  if (!matches.length) return null;
  return Number(matches[matches.length - 1][1].replace(',', '.'));
}

function floorParts(v: unknown): { floor: number | null; floors_total: number | null } {
  const s = clean(v);
  if (!s) return { floor: null, floors_total: null };
  const pair = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (pair) return { floor: Number(pair[1]), floors_total: Number(pair[2]) };
  const first = s.match(/\d{1,2}/);
  return { floor: first ? Number(first[0]) : null, floors_total: null };
}

function inferSaleDate(fileName?: string): string {
  const year = clean(fileName)?.match(/\b(20\d{2})\b/)?.[1];
  return year ? `${year}-01-01` : new Date().toISOString().slice(0, 10);
}

function inferPropertyType(body: any, r: any): string {
  if (body?.property_type === 'house' || body?.property_type === 'apartment') return body.property_type;
  const src = `${body?.file_name ?? ''} ${r.property_type ?? ''} ${r.building_type ?? ''}`.toLowerCase();
  if (/буд|таун|дуплекс|котедж|house/.test(src)) return 'house';
  if (/кварт|apartment/.test(src)) return 'apartment';
  return 'apartment';
}

function normalizeCsvRow(r: any, body: any): any {
  const floor = floorParts(r.floor);
  const comment = [clean(r.characteristics), clean(r.comment), clean(r.comment_extra)].filter(Boolean).join('\n') || null;
  return {
    property_type: inferPropertyType(body, r),
    district: clean(r.district),
    address_hint: clean(r.address_hint),
    rooms: rooms(r.rooms),
    total_area: num(r.total_area) ?? areaFromText(r.characteristics, r.comment),
    land_area: clean(r.land_area),
    communications: clean(r.communications),
    amenities: clean(r.amenities),
    living_area: num(r.living_area),
    kitchen_area: num(r.kitchen_area),
    floor: num(r.floor) ?? floor.floor,
    floors_total: num(r.floors_total) ?? floor.floors_total,
    building_type: clean(r.building_type),
    condition: clean(r.condition),
    furniture: clean(r.furniture),
    sale_term: clean(r.sale_term),
    year_built: num(r.year_built),
    initial_price: num(r.initial_price),
    final_price: num(r.final_price),
    currency: clean(r.currency) ?? 'USD',
    sale_date: clean(r.sale_date) ?? inferSaleDate(body?.file_name),
    source_type: clean(r.source_type) ?? 'csv',
    listing_url: clean(r.listing_url),
    comment,
  };
}

export async function importCsv(req: Request, env: Env): Promise<Response> {
  const u = await requireApproved(req, env); if (u instanceof Response) return u;
  const body = await req.json().catch(() => null) as any;
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) return err(400, 'Немає рядків', env, req);
  const wantStatus = u.role !== 'user' && body?.status === 'approved' ? 'approved' : 'pending';
  let created = 0, dup = 0, errs = 0;
  const now = nowIso();
  for (const raw of rows) {
    try {
      const r = normalizeCsvRow(raw, body);
      if (!r.property_type || !r.district || !r.total_area || !r.final_price || !r.currency || !r.sale_date || !r.source_type) { errs++; continue; }
      // Дублікат: дата + район + кімнати + площа + ціна
      const existing = await env.DB.prepare(
        'SELECT id FROM sales WHERE sale_date = ? AND district = ? AND total_area = ? AND final_price = ? AND (rooms IS ? OR rooms = ?)',
      ).bind(r.sale_date, r.district, Number(r.total_area), Number(r.final_price), r.rooms ?? null, r.rooms ?? null).first();
      if (existing) { dup++; continue; }
      const id = uid();
      const ip = r.initial_price != null ? Number(r.initial_price) : null;
      const fp = Number(r.final_price);
      const da = ip ? ip - fp : null;
      const dp = ip && ip > 0 ? (da! / ip) * 100 : null;
      await env.DB.prepare(
        `INSERT INTO sales (id, property_type, district, address_hint, rooms, total_area, land_area, communications, amenities, living_area, kitchen_area, floor, floors_total, building_type, condition, furniture, sale_term, year_built, initial_price, final_price, currency, discount_amount, discount_percent, sale_date, source_type, listing_url, comment, status, submitted_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id, r.property_type, r.district, r.address_hint ?? null, r.rooms ?? null,
        Number(r.total_area), r.land_area ?? null, r.communications ?? null, r.amenities ?? null,
        r.living_area ?? null, r.kitchen_area ?? null,
        r.floor ?? null, r.floors_total ?? null, r.building_type ?? null, r.condition ?? null,
        r.furniture ?? null, r.sale_term ?? null, r.year_built ?? null, ip, fp, r.currency, da, dp, r.sale_date, r.source_type,
        r.listing_url ?? null, r.comment ?? null, wantStatus, u.id, now, now,
      ).run();
      created++;
    } catch { errs++; }
  }
  await env.DB.prepare(
    'INSERT INTO imports (id, source_type, file_name, raw_text, imported_by, total_rows, created_count, duplicate_count, error_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(uid(), 'csv', body?.file_name ?? null, null, u.id, rows.length, created, dup, errs, now).run();
  return json({ total: rows.length, created, duplicates: dup, errors: errs }, {}, env, req);
}

export async function listImports(req: Request, env: Env): Promise<Response> {
  const u = await requireRole(req, env, ['admin', 'moderator']); if (u instanceof Response) return u;
  const { results } = await env.DB.prepare(
    'SELECT id, source_type, file_name, total_rows, created_count, duplicate_count, error_count, created_at FROM imports ORDER BY created_at DESC LIMIT 100',
  ).all();
  return json({ imports: results }, {}, env, req);
}
