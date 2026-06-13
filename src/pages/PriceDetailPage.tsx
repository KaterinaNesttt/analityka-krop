import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Sale = {
  id: string;
  district: string;
  floor: string | null;
  characteristics: string | null;
  sale_term: string | null;
  initial_price: number | null;
  final_price: number | null;
  comment: string | null;
  status: string;
};

interface LocalFilters {
  district: string;
  price_min: string;
  price_max: string;
  floor: string;
  sale_term: string;
}

const EMPTY_FILTERS: LocalFilters = { district: "", price_min: "", price_max: "", floor: "", sale_term: "" };

export function PriceDetailPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LocalFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<LocalFilters>(EMPTY_FILTERS);

  const sales = useQuery({
    queryKey: ["approved-sales", {}, "created_at_desc"],
    queryFn: () =>
      api<{ sales: Sale[] }>("/api/sales", { query: { status: "approved", limit: 1000, sort: "created_at_desc" } }),
  });

  const data = useMemo(() => {
    const rows = (sales.data?.sales ?? []).filter((s) => {
      if (applied.district && !s.district.toLowerCase().includes(applied.district.toLowerCase())) return false;
      if (applied.floor && !(s.floor ?? "").toLowerCase().includes(applied.floor.toLowerCase())) return false;
      if (applied.sale_term && !(s.sale_term ?? "").toLowerCase().includes(applied.sale_term.toLowerCase())) return false;
      if (applied.price_min && isNum(s.final_price) && s.final_price < Number(applied.price_min)) return false;
      if (applied.price_max && isNum(s.final_price) && s.final_price > Number(applied.price_max)) return false;
      return true;
    });

    const points = rows.map((s, i) => ({
      idx: i + 1,
      initialPrice: isNum(s.initial_price) ? s.initial_price : null,
      finalPrice: isNum(s.final_price) ? s.final_price : null,
    }));

    const prices = rows.map((s) => s.final_price).filter(isNum);

    return {
      points,
      total: rows.length,
      avgPrice: avg(prices),
      medianPrice: med(prices),
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
    };
  }, [sales.data, applied]);

  const upd = (k: keyof LocalFilters, v: string) => setFilters((p) => ({ ...p, [k]: v }));

  return (
    <PageShell>
      <PageHeader title="Цінові коридори — деталі">
        <Button variant="outline" size="sm" className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 gap-1" onClick={() => navigate("/analytics")}>
          <ArrowLeft className="h-4 w-4" /> Аналітика
        </Button>
      </PageHeader>

      {/* Фільтри */}
      <Card className="mb-5 rounded-2xl border-white/5">
        <CardContent className="p-4">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Field label="Район/ЖК">
              <Input value={filters.district} onChange={(e) => upd("district", e.target.value)} />
            </Field>
            <Field label="Поверх">
              <Input value={filters.floor} onChange={(e) => upd("floor", e.target.value)} />
            </Field>
            <Field label="Термін продажу">
              <Input value={filters.sale_term} onChange={(e) => upd("sale_term", e.target.value)} />
            </Field>
            <Field label="Ціна від">
              <Input type="number" value={filters.price_min} onChange={(e) => upd("price_min", e.target.value)} />
            </Field>
            <Field label="Ціна до">
              <Input type="number" value={filters.price_max} onChange={(e) => upd("price_max", e.target.value)} />
            </Field>
            <div className="flex items-end gap-2">
              <Button size="sm" onClick={() => setApplied(filters)}>
                Застосувати
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setApplied(EMPTY_FILTERS);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Скинути
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="mb-5 grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Угод" value={fmtNumber(data.total)} />
        <Stat label="Середня ціна" value={fmtMoney(data.avgPrice)} />
        <Stat label="Медіана" value={fmtMoney(data.medianPrice)} />
        <Stat label="Діапазон" value={data.minPrice != null && data.maxPrice != null ? `${fmtMoney(data.minPrice)} – ${fmtMoney(data.maxPrice)}` : "—"} />
      </div>

      {/* Графік */}
      {sales.isLoading ? (
        <div className="h-96 rounded-2xl animate-pulse bg-card/60" />
      ) : !data.points.length ? (
        <Card className="rounded-2xl border-white/5">
          <CardContent className="p-10 text-center text-muted-foreground">Немає даних за цими фільтрами.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-white/5">
          <CardContent className="p-5">
            <div className="h-[28rem]">
              <ResponsiveContainer>
                <AreaChart data={data.points} margin={{ top: 16, right: 20, bottom: 12, left: 0 }}>
                  <defs>
                    <linearGradient id="pdp-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="idx" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<DetailTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="initialPrice"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    fill="none"
                    dot={false}
                    connectNulls
                    name="Стартова"
                  />
                  <Area
                    type="monotone"
                    dataKey="finalPrice"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#pdp-fill)"
                    dot={false}
                    connectNulls
                    activeDot={{ r: 4, fill: "#06b6d4", stroke: "#fff", strokeWidth: 2 }}
                    name="Продаж"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

/* ─── helpers ─── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-white/5">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function DetailTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; stroke?: string; color?: string }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-popover/95 px-3 py-2 text-sm border border-white/10 shadow-lg">
      {payload.map(
        (entry, i) =>
          entry.value != null && (
            <div key={i} className="flex items-center justify-between gap-4 min-w-40">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: entry.stroke || entry.color }} />
                {entry.name}
              </span>
              <span className="font-medium tabular-nums">{fmtMoney(entry.value)}</span>
            </div>
          ),
      )}
    </div>
  );
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function avg(vals: number[]): number | null {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function med(vals: number[]): number | null {
  const s = [...vals].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
