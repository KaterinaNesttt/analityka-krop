import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtMoney, fmtNumber } from "@/lib/format";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export interface PricePoint {
  idx: number;
  initialPrice: number | null;
  finalPrice: number | null;
}

export interface ChartItem {
  label: string;
  value: number;
}

/* ═══════════════════════════════════════════
   Palette — яскраві, різнобарвні, не сині
   ═══════════════════════════════════════════ */

const PALETTE = [
  "#d4a84f", // gold
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // purple
  "#ef4444", // red
  "#64748b", // slate
];

/* ═══════════════════════════════════════════
   Позиції районів на карті Кропивницького (%)
   ═══════════════════════════════════════════ */

const DISTRICT_POS: Record<string, { x: number; y: number }> = {
  "Центр": { x: 48, y: 42 },
  "Балашівка": { x: 30, y: 60 },
  "Нова Балашівка": { x: 28, y: 48 },
  "Завадівка": { x: 55, y: 72 },
  "Олексіївка": { x: 62, y: 38 },
  "Арнаутове": { x: 58, y: 62 },
  "Лелеківка": { x: 60, y: 22 },
  "Попова": { x: 42, y: 18 },
  "Жадова": { x: 35, y: 28 },
  "Маслениківка": { x: 22, y: 52 },
  "Бєляєва": { x: 48, y: 58 },
  "Ковалівка": { x: 48, y: 12 },
  "Фортечна": { x: 45, y: 50 },
  "Кущівка": { x: 68, y: 42 },
  "Велика Балка": { x: 58, y: 48 },
  "Шкільна": { x: 40, y: 35 },
  "Озерна": { x: 52, y: 32 },
  "Молодіжний": { x: 55, y: 28 },
  "Дружба": { x: 38, y: 55 },
  "Попова Балка": { x: 42, y: 18 },
};

/* ═══════════════════════════════════════════
   ChartsSection — головна сітка 5 графіків
   ═══════════════════════════════════════════ */

interface ChartsSectionProps {
  pricePoints: PricePoint[];
  floorRows: ChartItem[];
  termRows: ChartItem[];
  districtRows: ChartItem[];
  allDistrictRows: ChartItem[];
  discountBuckets: ChartItem[];
  avgDiscount: number | null;
  detailPath?: string;
}

export function ChartsSection({
  pricePoints,
  floorRows,
  termRows,
  districtRows,
  allDistrictRows,
  discountBuckets,
  avgDiscount,
  detailPath = "/analytics/prices",
}: ChartsSectionProps) {
  const [showDistrictsModal, setShowDistrictsModal] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Row 1: Цінові коридори + Поверхи */}
      <section className="mb-5 grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <PriceCorridorsCard data={pricePoints} onDetail={() => navigate(detailPath)} />
        <FloorsDonutCard data={floorRows} />
      </section>

      {/* Row 2: Термін + Райони + Торг */}
      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SaleTermBarsCard data={termRows} />
        <DistrictsMapCard data={districtRows} onShowMore={() => setShowDistrictsModal(true)} />
        <BargainingGaugeCard data={discountBuckets} avgDiscount={avgDiscount} />
      </section>

      <DistrictsFullModal
        open={showDistrictsModal}
        onOpenChange={setShowDistrictsModal}
        data={allDistrictRows}
      />
    </>
  );
}

/* ═══════════════════════════════════════════
   1. Цінові коридори — dual area/line chart
   ═══════════════════════════════════════════ */

function PriceCorridorsCard({ data, onDetail }: { data: PricePoint[]; onDetail: () => void }) {
  return (
    <ChartCard>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Цінові коридори</h3>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-sm gap-1 px-4"
          onClick={onDetail}
        >
          Детальніше <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-64 mt-2">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pc-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.32} />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="idx" hide />
            <YAxis hide />
            <Tooltip content={<PriceTooltip />} />
            <Area
              type="monotone"
              dataKey="initialPrice"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="none"
              dot={false}
              connectNulls
              name="Стартова"
            />
            <Area
              type="monotone"
              dataKey="finalPrice"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#pc-area-fill)"
              dot={false}
              connectNulls
              activeDot={{ r: 5, fill: "#06b6d4", stroke: "#fff", strokeWidth: 2 }}
              name="Продаж"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function PriceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number; stroke?: string; color?: string }> }) {
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

/* ═══════════════════════════════════════════
   2. Поверхи — donut chart
   ═══════════════════════════════════════════ */

function FloorsDonutCard({ data }: { data: ChartItem[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard>
      <h3 className="text-lg font-semibold mb-3 text-center">Поверхи</h3>
      <div className="flex items-center gap-4">
        <div className="h-52 flex-1 min-w-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="84%"
                paddingAngle={2}
                cornerRadius={4}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2.5 text-sm shrink-0">
          {data.slice(0, 8).map((item, i) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="text-muted-foreground text-xs whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = total > 0 ? ((Number(item.value) / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-xl bg-popover/95 px-3 py-2 text-sm border border-white/10 shadow-lg">
      <div className="font-medium">{item.name}</div>
      <div className="text-muted-foreground">
        {fmtNumber(item.value)} угод ({pct}%)
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. Термін продажу — gradient bar chart
   ═══════════════════════════════════════════ */

function SaleTermBarsCard({ data }: { data: ChartItem[] }) {
  return (
    <ChartCard>
      <h3 className="text-lg font-semibold mb-2">Термін продажу</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 5, bottom: 5, left: 5 }}>
            <defs>
              {data.map((_, i) => {
                const t = data.length > 1 ? i / (data.length - 1) : 0;
                const topColor = lerpColor("#8b5cf6", "#06b6d4", t);
                const bottomColor = lerpColor("#6d28d9", "#0891b2", t);
                return (
                  <linearGradient key={i} id={`tb-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={topColor} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={bottomColor} stopOpacity={0.6} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <Tooltip content={<SimpleTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[8, 8, 2, 2]} barSize={data.length > 8 ? 18 : 30}>
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#tb-${i})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* ═══════════════════════════════════════════
   4. Райони — карта з крапками
   ═══════════════════════════════════════════ */

function DistrictsMapCard({ data, onShowMore }: { data: ChartItem[]; onShowMore: () => void }) {
  const shown = data.slice(0, 8);

  return (
    <ChartCard>
      <h3 className="text-lg font-semibold mb-3 text-center">Райони</h3>
      <div className="flex gap-3 items-stretch">
        {/* Карта */}
        <div className="relative flex-1 min-h-44" style={{ aspectRatio: "4/5" }}>
          <img
            src="/krop-map.png"
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{ mixBlendMode: "multiply", opacity: 0.55, filter: "contrast(1.2)" }}
            draggable={false}
          />
          {shown.map((item, i) => {
            const pos = getDistrictPos(item.label, i, shown.length);
            return (
              <div
                key={item.label}
                className="absolute rounded-full"
                title={`${item.label}: ${item.value}`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 14,
                  height: 14,
                  background: PALETTE[i % PALETTE.length],
                  boxShadow: `0 0 14px 5px ${PALETTE[i % PALETTE.length]}55`,
                }}
              />
            );
          })}
        </div>

        {/* Легенда */}
        <div className="flex flex-col gap-1.5 text-xs shrink-0 justify-center">
          {shown.map((item, i) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="text-muted-foreground truncate max-w-24">{shortLbl(item.label, 14)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-sm gap-1 px-4"
          onClick={onShowMore}
        >
          Більше <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </ChartCard>
  );
}

/* ═══════════════════════════════════════════
   5. Торг — gauge / semi-donut
   ═══════════════════════════════════════════ */

function BargainingGaugeCard({ data, avgDiscount }: { data: ChartItem[]; avgDiscount: number | null }) {
  return (
    <ChartCard>
      <h3 className="text-lg font-semibold mb-1 text-center">Торг</h3>
      <div className="relative h-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              startAngle={200}
              endAngle={-20}
              innerRadius="60%"
              outerRadius="88%"
              paddingAngle={3}
              cornerRadius={5}
              strokeWidth={0}
              cx="50%"
              cy="56%"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<GaugeTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Центральний текст */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: "6%" }}>
          <span className="text-3xl font-bold tabular-nums">{avgDiscount != null ? `${fmtNumber(avgDiscount, 1)}%` : "—"}</span>
          <span className="text-xs text-muted-foreground">середній</span>
        </div>
      </div>
      {/* Легенда знизу */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs -mt-2">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function GaugeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl bg-popover/95 px-3 py-2 text-sm border border-white/10 shadow-lg">
      <div className="font-medium">{item.name}</div>
      <div className="text-muted-foreground">{fmtNumber(item.value)} угод</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Модалка — повний графік усіх районів
   ═══════════════════════════════════════════ */

function DistrictsFullModal({ open, onOpenChange, data }: { open: boolean; onOpenChange: (v: boolean) => void; data: ChartItem[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-white/10">
        <DialogHeader>
          <DialogTitle>Усі райони</DialogTitle>
          <DialogDescription>Розподіл угод по районах та ЖК</DialogDescription>
        </DialogHeader>
        <div style={{ height: Math.max(320, data.length * 32) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <defs>
                <linearGradient id="dm-bar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d4a84f" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#d4a84f" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                width={130}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) => shortLbl(v, 18)}
              />
              <Tooltip content={<SimpleTooltip />} cursor={false} />
              <Bar dataKey="value" fill="url(#dm-bar)" barSize={18} radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════
   Shared UI
   ═══════════════════════════════════════════ */

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-white/5">
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  );
}

function SimpleTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ChartItem }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-xl bg-popover/95 px-3 py-2 text-sm border border-white/10 shadow-lg">
      <div className="font-medium">{item.label}</div>
      <div className="text-muted-foreground">{fmtNumber(item.value)} угод</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function getDistrictPos(name: string, idx: number, total: number): { x: number; y: number } {
  // Точна позиція для відомих районів
  const normalized = name.trim();
  for (const [key, pos] of Object.entries(DISTRICT_POS)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) return pos;
  }
  // Hash-based fallback для невідомих
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const angle = (idx / Math.max(total, 1)) * Math.PI * 2;
  const r = 18 + (hash % 12);
  return {
    x: Math.min(75, Math.max(25, 50 + Math.cos(angle) * r)),
    y: Math.min(78, Math.max(18, 48 + Math.sin(angle) * r)),
  };
}

function shortLbl(v: string, max = 14): string {
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

function lerpColor(from: string, to: string, t: number): string {
  const f = hexRgb(from);
  const c = hexRgb(to);
  const r = Math.round(f.r + (c.r - f.r) * t);
  const g = Math.round(f.g + (c.g - f.g) * t);
  const b = Math.round(f.b + (c.b - f.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
}
