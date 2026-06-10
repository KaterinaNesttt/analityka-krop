import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { FiltersBar, type SalesFilters } from "@/components/filters-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AreaChart as AreaIcon, BadgeDollarSign, Building2, DoorOpen, Home, MapPinned, SlidersHorizontal, TrendingDown } from "lucide-react";

type Sale = {
  id: string;
  property_type: string;
  district: string;
  rooms: number | null;
  total_area: number | null;
  floor: number | null;
  floors_total: number | null;
  building_type: string | null;
  land_area: string | null;
  initial_price: number | null;
  final_price: number;
  currency: string;
  sale_date: string;
  sale_term: string | null;
  status: string;
};

type TooltipRow = { label: string; value: string };
type ChartDatum = Record<string, unknown> & { tooltipRows?: TooltipRow[] };

const GOLD = "#d4a84f";
const SAGE = "#8d9a70";
const CYAN = "#4fc3c7";

const PRICE_BUCKETS = [
  { label: "до $30k", min: 0, max: 30000 },
  { label: "$30k-$50k", min: 30000, max: 50000 },
  { label: "$50k-$70k", min: 50000, max: 70000 },
  { label: "$70k-$100k", min: 70000, max: 100000 },
  { label: "$100k+", min: 100000, max: Infinity },
];

const AREA_BUCKETS = [
  { label: "без площі", min: null, max: null },
  { label: "до 40 м²", min: 0, max: 40 },
  { label: "40-70 м²", min: 40, max: 70 },
  { label: "70-120 м²", min: 70, max: 120 },
  { label: "120+ м²", min: 120, max: Infinity },
];

const DISCOUNT_BUCKETS = [
  { label: "без торгу", min: -Infinity, max: 0.01 },
  { label: "до 2%", min: 0.01, max: 2 },
  { label: "2-5%", min: 2, max: 5 },
  { label: "5-10%", min: 5, max: 10 },
  { label: "10%+", min: 10, max: Infinity },
];

export function AnalyticsPage() {
  const [filters, setFilters] = useState<SalesFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sales = useQuery({
    queryKey: ["analytics-sales", filters],
    queryFn: () => api<{ sales: Sale[] }>("/api/sales", { query: { ...filters, limit: 1000, sort: "sale_date_desc" } }),
  });

  const data = useMemo(() => buildAnalytics(sales.data?.sales ?? [], filters), [sales.data, filters]);

  return (
    <PageShell>
      <PageHeader title="Аналітика">
        <Button variant={filtersOpen ? "default" : "outline"} size="sm" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Фільтр
        </Button>
      </PageHeader>

      {filtersOpen && (
        <div className="mb-5 rounded-md border border-border/60 bg-muted/20 p-4">
          <FiltersBar value={filters} onChange={setFilters} frameless />
        </div>
      )}

      {sales.isLoading ? (
        <LoadingGrid />
      ) : !data.total ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">За цими фільтрами немає підтверджених продажів.</CardContent>
        </Card>
      ) : (
        <>
          <section className="mb-5 grid gap-4 xl:grid-cols-[1fr_0.7fr]">
            <Card className="overflow-hidden">
              <CardContent className="bg-[radial-gradient(circle_at_top_left,rgba(212,168,79,0.16),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Поточна вибірка</div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                      <span className="text-5xl font-semibold tabular-nums">{fmtNumber(data.total)}</span>
                      <span className="text-lg text-muted-foreground">угод</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.activeFilterLabels.length ? data.activeFilterLabels.map((label) => <Badge key={label} variant="secondary" className="rounded-md">{label}</Badge>) : <Badge variant="secondary" className="rounded-md">Усі дані</Badge>}
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <SummaryCell label="Медіанна ціна" value={fmtMoney(data.medianPrice)} />
                  <SummaryCell label="Середня ціна" value={fmtMoney(data.avgPrice)} />
                  <SummaryCell label="Діапазон" value={`${fmtMoney(data.minPrice)} - ${fmtMoney(data.maxPrice)}`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Швидкі висновки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InsightLine icon={<Home className="h-4 w-4" />} label="Квартири" value={`${fmtNumber(data.apartmentCount)} угод`} />
                <InsightLine icon={<Building2 className="h-4 w-4" />} label="Будинки" value={`${fmtNumber(data.houseCount)} угод`} />
                <InsightLine icon={<AreaIcon className="h-4 w-4" />} label="Площа вказана" value={`${fmtNumber(data.withArea)} з ${fmtNumber(data.total)}`} />
                <InsightLine icon={<TrendingDown className="h-4 w-4" />} label="Середній торг" value={data.avgDiscount == null ? "—" : `${fmtNumber(data.avgDiscount, 1)}%`} />
              </CardContent>
            </Card>
          </section>

          <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BadgeDollarSign className="h-5 w-5" />} label="Ціна за м²" value={fmtMoney(data.avgPricePerM2)} hint={`${fmtNumber(data.withArea)} записів з площею`} />
            <Metric icon={<MapPinned className="h-5 w-5" />} label="Найактивніший район" value={data.topDistrict?.label ?? "—"} hint={data.topDistrict ? `${fmtNumber(data.topDistrict.value)} угод` : "Немає даних"} />
            <Metric icon={<DoorOpen className="h-5 w-5" />} label="Найчастіша кімнатність" value={data.topRooms?.label ?? "—"} hint={data.topRooms ? `${fmtNumber(data.topRooms.value)} квартир` : "Немає даних"} />
            <Metric icon={<SlidersHorizontal className="h-5 w-5" />} label="Без площі" value={fmtNumber(data.withoutArea)} hint="не входять у розрахунок за м²" />
          </section>

          <section className="mb-5 grid gap-4 xl:grid-cols-2">
            <ChartCard title="Квартири проти будинків" subtitle="Скільки угод і яка типова ціна">
              <BarChart data={data.typeComparison} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} width={82} />
                <Tooltip cursor={{ fill: "rgba(212,168,79,0.08)" }} content={<CleanTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.typeComparison.map((row) => <Cell key={row.label} fill={row.color} />)}
                </Bar>
              </BarChart>
            </ChartCard>

            <ChartCard title="Цінові коридори" subtitle="Де зосереджена основна маса угод">
              <AreaChart data={data.priceBuckets} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <defs>
                  <linearGradient id="analyticsPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.42} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ stroke: GOLD, strokeWidth: 1 }} content={<CleanTooltip />} />
                <Area type="monotone" dataKey="value" stroke={GOLD} fill="url(#analyticsPrice)" strokeWidth={2} />
              </AreaChart>
            </ChartCard>
          </section>

          <section className="mb-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <ChartCard title="Райони" subtitle="Рейтинг за кількістю продажів">
              <BarChart data={data.districtRows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tickFormatter={shortLabel} stroke="var(--color-muted-foreground)" fontSize={11} width={112} />
                <Tooltip cursor={{ fill: "rgba(212,168,79,0.08)" }} content={<CleanTooltip />} />
                <Bar dataKey="value" fill={GOLD} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Площа" subtitle="Окремо видно записи без площі">
              <BarChart data={data.areaBuckets} margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(212,168,79,0.08)" }} content={<CleanTooltip />} />
                <Bar dataKey="value" fill={SAGE} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>
          </section>

          <section className="mb-5 grid gap-4 xl:grid-cols-2">
            <ChartCard title="Кімнатність квартир" subtitle="Які квартири продаються найчастіше">
              <BarChart data={data.roomRows} margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(79,195,199,0.08)" }} content={<CleanTooltip />} />
                <Bar dataKey="value" fill={CYAN} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Торг від стартової ціни" subtitle="Наскільки часто ціна знижувалась">
              <BarChart data={data.discountBuckets} margin={{ top: 4, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(212,168,79,0.08)" }} content={<CleanTooltip />} />
                <Bar dataKey="value" fill={GOLD} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Leaderboard title="Типи будинків" rows={data.houseTypes} empty="Тип будинку не заповнено." />
            <Leaderboard title="Поверхи квартир" rows={data.floorRows} empty="Поверх не заповнено." />
            <Leaderboard title="Термін продажу" rows={data.termRows} empty="Термін не заповнено." />
          </section>
        </>
      )}
    </PageShell>
  );
}

function buildAnalytics(rows: Sale[], filters: SalesFilters) {
  const total = rows.length;
  const prices = rows.map((sale) => sale.final_price).filter(isFiniteNumber);
  const areaRows = rows.filter((sale) => isFiniteNumber(sale.total_area) && Number(sale.total_area) > 0);
  const apartments = rows.filter((sale) => sale.property_type === "apartment");
  const houses = rows.filter((sale) => sale.property_type === "house");
  const discountValues = rows
    .filter((sale) => isFiniteNumber(sale.initial_price) && Number(sale.initial_price) > 0)
    .map((sale) => ((Number(sale.initial_price) - Number(sale.final_price)) / Number(sale.initial_price)) * 100);

  const typeComparison = [
    buildTypeRow("Квартири", apartments, CYAN),
    buildTypeRow("Будинки", houses, SAGE),
  ].filter((row) => row.value > 0);

  const districtRows = Object.values(groupBy(rows, (sale) => sale.district))
    .map((items) => {
      const label = items[0].district;
      return {
        label,
        value: items.length,
        tooltipRows: [
          { label: "Угоди", value: fmtNumber(items.length) },
          { label: "Медіанна ціна", value: fmtMoney(median(items.map((sale) => sale.final_price))) },
          { label: "Середня за м²", value: fmtMoney(average(items.filter((sale) => sale.total_area).map((sale) => Number(sale.final_price) / Number(sale.total_area)))) },
        ],
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 9);

  const priceBuckets = PRICE_BUCKETS.map((bucket) => {
    const items = rows.filter((sale) => sale.final_price >= bucket.min && sale.final_price < bucket.max);
    return {
      label: bucket.label,
      value: items.length,
      tooltipRows: [
        { label: "Угоди", value: fmtNumber(items.length) },
        { label: "Медіанна ціна", value: fmtMoney(median(items.map((sale) => sale.final_price))) },
      ],
    };
  });

  const areaBuckets = AREA_BUCKETS.map((bucket) => {
    const items = bucket.min == null
      ? rows.filter((sale) => !isFiniteNumber(sale.total_area))
      : rows.filter((sale) => isFiniteNumber(sale.total_area) && Number(sale.total_area) >= bucket.min! && Number(sale.total_area) < bucket.max!);
    return {
      label: bucket.label,
      value: items.length,
      tooltipRows: [
        { label: "Угоди", value: fmtNumber(items.length) },
        { label: "Середня ціна", value: fmtMoney(average(items.map((sale) => sale.final_price))) },
      ],
    };
  });

  const roomRows = Object.values(groupBy(apartments.filter((sale) => sale.rooms), (sale) => `${sale.rooms}-к`))
    .map((items) => {
      const label = `${items[0].rooms}-к`;
      return {
        label,
        value: items.length,
        tooltipRows: [
          { label: "Квартири", value: fmtNumber(items.length) },
          { label: "Медіанна ціна", value: fmtMoney(median(items.map((sale) => sale.final_price))) },
        ],
      };
    })
    .sort((a, b) => b.value - a.value);

  const discountBuckets = DISCOUNT_BUCKETS.map((bucket) => {
    const items = rows.filter((sale) => {
      if (!isFiniteNumber(sale.initial_price) || Number(sale.initial_price) <= 0) return bucket.label === "без торгу";
      const value = ((Number(sale.initial_price) - Number(sale.final_price)) / Number(sale.initial_price)) * 100;
      return value >= bucket.min && value < bucket.max;
    });
    return {
      label: bucket.label,
      value: items.length,
      tooltipRows: [
        { label: "Угоди", value: fmtNumber(items.length) },
        { label: "Середній торг", value: `${fmtNumber(average(items.map(discountForSale)), 1)}%` },
      ],
    };
  });

  const houseTypes = toLeaderboard(houses, (sale) => sale.building_type || "Не вказано", "Угоди");
  const floorRows = toLeaderboard(apartments, floorLabel, "Квартири");
  const termRows = toLeaderboard(rows.filter((sale) => sale.sale_term), (sale) => sale.sale_term || "Не вказано", "Угоди", 6);

  return {
    total,
    apartmentCount: apartments.length,
    houseCount: houses.length,
    withArea: areaRows.length,
    withoutArea: total - areaRows.length,
    avgPrice: average(prices),
    medianPrice: median(prices),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    avgPricePerM2: average(areaRows.map((sale) => Number(sale.final_price) / Number(sale.total_area))),
    avgDiscount: average(discountValues),
    activeFilterLabels: filterLabels(filters),
    topDistrict: districtRows[0],
    topRooms: roomRows[0],
    typeComparison,
    districtRows,
    priceBuckets,
    areaBuckets,
    roomRows,
    discountBuckets,
    houseTypes,
    floorRows,
    termRows,
  };
}

function buildTypeRow(label: string, items: Sale[], color: string): ChartDatum & { label: string; value: number; color: string } {
  return {
    label,
    value: items.length,
    color,
    tooltipRows: [
      { label: "Угоди", value: fmtNumber(items.length) },
      { label: "Середня ціна", value: fmtMoney(average(items.map((sale) => sale.final_price))) },
      { label: "Медіана", value: fmtMoney(median(items.map((sale) => sale.final_price))) },
    ],
  };
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactElement }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
          <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/45 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function InsightLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function Leaderboard({ title, rows, empty }: { title: string; rows: Array<{ label: string; value: number; tooltipRows?: TooltipRow[] }>; empty: string }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rows.length ? <div className="text-sm text-muted-foreground">{empty}</div> : null}
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">{fmtNumber(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CleanTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: ChartDatum }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const rows = payload[0]?.payload?.tooltipRows ?? [];
  return (
    <div className="rounded-md border bg-popover/95 px-3 py-2 text-sm shadow-xl">
      <div className="mb-1 font-medium">{label}</div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-44 items-center justify-between gap-4">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-36 rounded-lg border bg-card/70 animate-pulse" />)}
    </div>
  );
}

function toLeaderboard(rows: Sale[], getLabel: (sale: Sale) => string, valueLabel: string, limit = 5) {
  return Object.values(groupBy(rows, getLabel))
    .map((items) => ({
      label: getLabel(items[0]),
      value: items.length,
      tooltipRows: [
        { label: valueLabel, value: fmtNumber(items.length) },
        { label: "Медіанна ціна", value: fmtMoney(median(items.map((sale) => sale.final_price))) },
      ],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function floorLabel(sale: Sale): string {
  if (!sale.floor) return "Не вказано";
  if (sale.floor === 1) return "1 поверх";
  if (sale.floor <= 4) return "2-4 поверх";
  if (sale.floor <= 9) return "5-9 поверх";
  return "10+ поверх";
}

function discountForSale(sale: Sale): number {
  if (!isFiniteNumber(sale.initial_price) || Number(sale.initial_price) <= 0) return 0;
  return ((Number(sale.initial_price) - Number(sale.final_price)) / Number(sale.initial_price)) * 100;
}

function groupBy<T>(rows: T[], getKey: (row: T) => string): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = getKey(row);
    (acc[key] ??= []).push(row);
    return acc;
  }, {});
}

function average(values: Array<number | null | undefined>): number | null {
  const nums = values.map(Number).filter(isFiniteNumber);
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}

function median(values: Array<number | null | undefined>): number | null {
  const nums = values.map(Number).filter(isFiniteNumber).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function shortLabel(value: string): string {
  return value.length > 14 ? `${value.slice(0, 13)}…` : value;
}

function filterLabels(filters: SalesFilters): string[] {
  const labels: string[] = [];
  if (filters.date_from) labels.push(`від ${filters.date_from}`);
  if (filters.date_to) labels.push(`до ${filters.date_to}`);
  if (filters.district) labels.push(filters.district);
  if (filters.property_type) labels.push(filters.property_type === "apartment" ? "Квартири" : filters.property_type === "house" ? "Будинки" : filters.property_type);
  if (filters.rooms) labels.push(`${filters.rooms}-к`);
  if (filters.price_min) labels.push(`ціна від ${fmtMoney(Number(filters.price_min))}`);
  if (filters.price_max) labels.push(`ціна до ${fmtMoney(Number(filters.price_max))}`);
  if (filters.area_min) labels.push(`площа від ${filters.area_min} м²`);
  if (filters.area_max) labels.push(`площа до ${filters.area_max} м²`);
  if (filters.condition) labels.push(filters.condition);
  return labels;
}
