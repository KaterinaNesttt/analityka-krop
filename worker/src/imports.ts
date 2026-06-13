import type { Env } from "./types";
import { cachedJson, json, err, uid, nowIso, notModified, touchCacheVersion } from "./utils";
import { requireRole } from "./middleware";

// Простий парсер тексту з Telegram. Витягує очевидні поля.
export function parseTelegramText(text: string): Record<string, any> {
  const out: Record<string, any> = {};
  const lc = text.toLowerCase();

  const fl = lc.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (fl) out.floor = fl[0];

  // Ціна + валюта
  const priceUsd = text.match(/(\d[\d\s]{2,})\s*\$|\$\s*(\d[\d\s]{2,})|(\d[\d\s]{2,})\s*usd/i);
  const priceUah = text.match(/(\d[\d\s]{4,})\s*(?:грн|uah|₴)/i);
  const priceEur = text.match(/(\d[\d\s]{2,})\s*(?:€|eur)/i);
  if (priceUsd)
    out.final_price = Number((priceUsd[1] || priceUsd[2] || priceUsd[3]).replace(/\s/g, ""));
  else if (priceEur) out.final_price = Number(priceEur[1].replace(/\s/g, ""));
  else if (priceUah) out.final_price = Number(priceUah[1].replace(/\s/g, ""));

  // Район
  const districts = [
    "Центр",
    "Фортечний",
    "Подільський",
    "Новомиколаївка",
    "Лелеківка",
    "Завадівка",
    "Балка",
  ];
  for (const d of districts)
    if (text.toLowerCase().includes(d.toLowerCase())) {
      out.district = d;
      break;
    }

  out.characteristics = text;
  return out;
}

export async function parseTelegram(req: Request, env: Env): Promise<Response> {
  const u = await requireRole(req, env, ["admin", "moderator"]);
  if (u instanceof Response) return u;
  const body = (await req.json().catch(() => null)) as any;
  if (!body?.text || typeof body.text !== "string") return err(400, "Відсутній текст", env, req);
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
  const m = s
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function normalizeCsvRow(r: any): any {
  return {
    district: clean(r.district),
    floor: clean(r.floor),
    characteristics: clean(r.characteristics),
    sale_term: clean(r.sale_term),
    initial_price: num(r.initial_price),
    final_price: num(r.final_price),
    comment: clean(r.comment),
  };
}

export async function importCsv(req: Request, env: Env): Promise<Response> {
  const u = await requireRole(req, env, ["admin", "moderator"]);
  if (u instanceof Response) return u;
  const body = (await req.json().catch(() => null)) as any;
  const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
  if (!rows.length) return err(400, "Немає рядків", env, req);
  const wantStatus = u.role !== "user" && body?.status === "approved" ? "approved" : "pending";
  let created = 0,
    dup = 0,
    errs = 0;
  const now = nowIso();
  for (const raw of rows) {
    try {
      const r = normalizeCsvRow(raw);
      if (!r.district) {
        errs++;
        continue;
      }
      const existing = await env.DB.prepare(
        `SELECT id FROM sales
         WHERE district = ?
           AND COALESCE(floor, '') = ?
           AND COALESCE(characteristics, '') = ?
           AND COALESCE(sale_term, '') = ?
           AND (final_price IS ? OR final_price = ?)`,
      )
        .bind(
          r.district,
          r.floor ?? "",
          r.characteristics ?? "",
          r.sale_term ?? "",
          r.final_price,
          r.final_price,
        )
        .first();
      if (existing) {
        dup++;
        continue;
      }
      const id = uid();
      await env.DB.prepare(
        `INSERT INTO sales (id, district, floor, characteristics, sale_term, initial_price, final_price, comment, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          r.district,
          r.floor,
          r.characteristics,
          r.sale_term,
          r.initial_price,
          r.final_price,
          r.comment,
          wantStatus,
          now,
          now,
        )
        .run();
      created++;
    } catch {
      errs++;
    }
  }
  await env.DB.prepare(
    "INSERT INTO imports (id, source_type, file_name, raw_text, imported_by, total_rows, created_count, duplicate_count, error_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(uid(), "csv", body?.file_name ?? null, null, u.id, rows.length, created, dup, errs, now)
    .run();
  await touchCacheVersion(env, "sales");
  await touchCacheVersion(env, "imports");
  return json({ total: rows.length, created, duplicates: dup, errors: errs }, {}, env, req);
}

export async function listImports(req: Request, env: Env): Promise<Response> {
  const u = await requireRole(req, env, ["admin", "moderator"]);
  if (u instanceof Response) return u;
  const cached = await notModified("imports", env, req, u.role);
  if (cached) return cached;
  const { results } = await env.DB.prepare(
    "SELECT id, source_type, file_name, total_rows, created_count, duplicate_count, error_count, created_at FROM imports ORDER BY created_at DESC LIMIT 100",
  ).all();
  return cachedJson("imports", { imports: results }, env, req, u.role);
}
