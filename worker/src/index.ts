import type { Env } from "./types";
import { corsHeaders, err, json } from "./utils";
import * as auth from "./auth";
import * as users from "./users";
import * as sales from "./sales";
import * as analytics from "./analytics";
import * as imports from "./imports";

type Handler = (req: Request, env: Env, ...args: string[]) => Promise<Response>;

interface RouteDef {
  method: string;
  pattern: RegExp;
  handler: (req: Request, env: Env, m: RegExpMatchArray) => Promise<Response>;
}

const routes: RouteDef[] = [
  // auth
  { method: "POST", pattern: /^\/api\/auth\/register$/, handler: (r, e) => auth.register(r, e) },
  { method: "POST", pattern: /^\/api\/auth\/login$/, handler: (r, e) => auth.login(r, e) },
  { method: "POST", pattern: /^\/api\/auth\/refresh$/, handler: (r, e) => auth.refresh(r, e) },
  { method: "POST", pattern: /^\/api\/auth\/logout$/, handler: (r, e) => auth.logout(r, e) },
  { method: "GET", pattern: /^\/api\/auth\/me$/, handler: (r, e) => auth.me(r, e) },
  // users
  { method: "GET", pattern: /^\/api\/users$/, handler: (r, e) => users.listUsers(r, e) },
  {
    method: "PATCH",
    pattern: /^\/api\/users\/([^/]+)\/approve$/,
    handler: (r, e, m) => users.approveUser(r, e, m[1]),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/users\/([^/]+)\/role$/,
    handler: (r, e, m) => users.setRole(r, e, m[1]),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/users\/([^/]+)\/block$/,
    handler: (r, e, m) => users.blockUser(r, e, m[1]),
  },
  // sales
  { method: "GET", pattern: /^\/api\/sales$/, handler: (r, e) => sales.listSales(r, e) },
  { method: "POST", pattern: /^\/api\/sales$/, handler: (r, e) => sales.createSale(r, e) },
  {
    method: "GET",
    pattern: /^\/api\/sales\/([^/]+)$/,
    handler: (r, e, m) => sales.getSale(r, e, m[1]),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/sales\/([^/]+)$/,
    handler: (r, e, m) => sales.updateSale(r, e, m[1]),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/sales\/([^/]+)\/approve$/,
    handler: (r, e, m) => sales.changeStatus(r, e, m[1], "approved"),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/sales\/([^/]+)\/reject$/,
    handler: (r, e, m) => sales.changeStatus(r, e, m[1], "rejected"),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/sales\/([^/]+)\/duplicate$/,
    handler: (r, e, m) => sales.changeStatus(r, e, m[1], "duplicate"),
  },
  {
    method: "DELETE",
    pattern: /^\/api\/sales\/([^/]+)$/,
    handler: (r, e, m) => sales.deleteSale(r, e, m[1]),
  },
  // analytics
  {
    method: "GET",
    pattern: /^\/api\/analytics\/summary$/,
    handler: (r, e) => analytics.summary(r, e),
  },
  {
    method: "GET",
    pattern: /^\/api\/analytics\/price-dynamics$/,
    handler: (r, e) => analytics.priceDynamics(r, e),
  },
  {
    method: "GET",
    pattern: /^\/api\/analytics\/price-per-m2$/,
    handler: (r, e) => analytics.pricePerM2(r, e),
  },
  {
    method: "GET",
    pattern: /^\/api\/analytics\/districts$/,
    handler: (r, e) => analytics.byDistrict(r, e),
  },
  {
    method: "GET",
    pattern: /^\/api\/analytics\/floors$/,
    handler: (r, e) => analytics.byFloors(r, e),
  },
  {
    method: "GET",
    pattern: /^\/api\/analytics\/discounts$/,
    handler: (r, e) => analytics.discounts(r, e),
  },
  {
    method: "GET",
    pattern: /^\/api\/analytics\/comparison$/,
    handler: (r, e) => analytics.comparison(r, e),
  },
  {
    method: "GET",
    pattern: /^\/api\/analytics\/distribution$/,
    handler: (r, e) => analytics.distribution(r, e),
  },
  // imports
  {
    method: "POST",
    pattern: /^\/api\/import\/telegram-text$/,
    handler: (r, e) => imports.parseTelegram(r, e),
  },
  { method: "POST", pattern: /^\/api\/import\/csv$/, handler: (r, e) => imports.importCsv(r, e) },
  { method: "GET", pattern: /^\/api\/imports$/, handler: (r, e) => imports.listImports(r, e) },
];

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, req) });
    }
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "analityka-krop-api" }, {}, env, req);
    }
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = url.pathname.match(r.pattern);
      if (m) {
        try {
          return await r.handler(req, env, m);
        } catch (e: any) {
          console.error(e);
          return err(500, "Internal error", env, req);
        }
      }
    }
    return err(404, "Не знайдено", env, req);
  },
};
