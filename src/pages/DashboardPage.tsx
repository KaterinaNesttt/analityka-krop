import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Building2, MapPin, PiggyBank } from "lucide-react";
import { ChartsSection, type PricePoint, type ChartItem } from "@/components/analytics-charts";

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

const DISCOUNT_BUCKETS = [
  { label: "без торгу", min: -Infinity, max: 0.01 },
  { label: "до 2%", min: 0.01, max: 2 },
  { label: "2-5%", min: 2, max: 5 },
  { label: "5-10%", min: 5, max: 10 },
  { label: "10%+", min: 10, max: Infinity },
];

export function DashboardPage() {
  const sales = useQuery({
    queryKey: ["approved-sales", {}, "created_at_desc"],
    queryFn: () =>
      api<{ sales: Sale[] }>("/api/sales", {
        query: { status: "approved", limit: 1000, sort: "created_at_desc" },
      }),
  });

  const data = useMemo(() => buildDashboardData(sales.data?.sales ?? []), [sales.data]);

  if (sales.isLoading) {
    return (
      <PageShell>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg border bg-card/70" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!data.total) {
    return (
      <PageShell>
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Немає підтверджених продажів для аналізу.
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Hero */}
      <section className="mb-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className=" p-5 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Підтверджена база</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <span className="text-4xl font-semibold tabular-nums">{fmtNumber(data.total)}</span>
                <span className="text-lg text-muted-foreground">угод</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.summaryBadges.map((item) => (
                <Badge key={item} variant="secondary" className="rounded-md">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroFact label="Середня ціна" value={fmtMoney(data.avgPrice)} />
            <HeroFact label="Медіана" value={fmtMoney(data.medianPrice)} />
            <HeroFact label="З ціною продажу" value={`${fmtNumber(data.priceCoverage)}%`} />
          </div>
        </Card>

        <Card className="">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Якість даних</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressRow label="З ціною продажу" value={data.withFinalPrice} total={data.total} />
            <ProgressRow
              label="Зі стартовою ціною"
              value={data.withInitialPrice}
              total={data.total}
            />
            <ProgressRow label="З терміном продажу" value={data.withSaleTerm} total={data.total} />
          </CardContent>
        </Card>
      </section>

      {/* Метрики */}
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Building2 className="h-5 w-5" />}
          label="Локацій"
          value={fmtNumber(data.locationCount)}
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="З терміном"
          value={fmtNumber(data.withSaleTerm)}
        />
        <MetricCard
          icon={<MapPin className="h-5 w-5" />}
          label="З коментарем"
          value={fmtNumber(data.withComment)}
        />
        <MetricCard
          icon={<PiggyBank className="h-5 w-5" />}
          label="Середній торг"
          value={data.avgDiscount == null ? "—" : `${fmtNumber(data.avgDiscount, 1)}%`}
        />
      </div>

      {/* ═══ НОВІ ГРАФІКИ ═══ */}
      <ChartsSection
        pricePoints={data.pricePoints}
        floorRows={data.floorRows}
        termRows={data.termRows}
        districtRows={data.districtRows}
        allDistrictRows={data.allDistrictRows}
        discountBuckets={data.discountBuckets}
        avgDiscount={data.avgDiscount}
      />
    </PageShell>
  );
}

/* ═══════════════════════════════════════════
   Data builder
   ═══════════════════════════════════════════ */

function buildDashboardData(input: Sale[]) {
  const rows = input.filter((sale) => sale.status === "approved");
  const total = rows.length;
  const prices = rows.map((sale) => Number(sale.final_price)).filter(isFiniteNumber);
  const withFinalPrice = prices.length;
  const withInitialPrice = rows.filter(
    (sale) => isFiniteNumber(sale.initial_price) && Number(sale.initial_price) > 0,
  ).length;
  const withSaleTerm = rows.filter((sale) => sale.sale_term).length;
  const withComment = rows.filter((sale) => sale.comment).length;
  const discounts = rows
    .filter(
      (sale) =>
        isFiniteNumber(sale.initial_price) &&
        Number(sale.initial_price) > 0 &&
        isFiniteNumber(sale.final_price),
    )
    .map(
      (sale) =>
        ((Number(sale.initial_price) - Number(sale.final_price)) / Number(sale.initial_price)) *
        100,
    );

  // Цінові коридори — кожна угода як точка, БЕЗ сортування
  const pricePoints: PricePoint[] = rows.map((sale, i) => ({
    idx: i + 1,
    initialPrice:
      isFiniteNumber(sale.initial_price) && Number(sale.initial_price) > 0
        ? Number(sale.initial_price)
        : null,
    finalPrice: isFiniteNumber(sale.final_price) ? Number(sale.final_price) : null,
  }));

  // Райони — БЕЗ сортування для графіку, із сортуванням для leaderboard
  const districtData = Object.values(groupBy(rows, (sale) => sale.district));
  const allDistrictRows: ChartItem[] = districtData.map((items) => ({
    label: items[0].district,
    value: items.length,
  }));
  const districtRows = allDistrictRows.slice(0, 8);

  // Поверхи — БЕЗ сортування
  const floorRows: ChartItem[] = Object.values(
    groupBy(
      rows.filter((sale) => sale.floor),
      (sale) => sale.floor || "Не вказано",
    ),
  ).map((items) => ({
    label: items[0].floor || "Не вказано",
    value: items.length,
  }));

  // Термін продажу — БЕЗ сортування
  const termRows: ChartItem[] = Object.values(
    groupBy(
      rows.filter((sale) => sale.sale_term),
      (sale) => sale.sale_term || "Не вказано",
    ),
  ).map((items) => ({
    label: items[0].sale_term || "Не вказано",
    value: items.length,
  }));

  // Торг — бакети
  const discountBuckets: ChartItem[] = DISCOUNT_BUCKETS.map((bucket) => {
    const cnt = rows.filter((sale) => {
      if (
        !isFiniteNumber(sale.initial_price) ||
        Number(sale.initial_price) <= 0 ||
        !isFiniteNumber(sale.final_price)
      )
        return bucket.label === "без торгу";
      const d =
        ((Number(sale.initial_price) - Number(sale.final_price)) / Number(sale.initial_price)) *
        100;
      return d >= bucket.min && d < bucket.max;
    }).length;
    return { label: bucket.label, value: cnt };
  });

  // Sorted copies для leaderboard
  const floorRowsSorted = [...floorRows].sort((a, b) => b.value - a.value).slice(0, 6);
  const termRowsSorted = [...termRows].sort((a, b) => b.value - a.value);

  return {
    total,
    avgPrice: average(prices),
    medianPrice: median(prices),
    avgDiscount: average(discounts),
    withFinalPrice,
    withInitialPrice,
    withSaleTerm,
    withComment,
    priceCoverage: total ? (withFinalPrice / total) * 100 : 0,
    locationCount: Object.keys(groupBy(rows, (sale) => sale.district)).length,
    pricePoints,
    districtRows,
    allDistrictRows,
    floorRows,
    termRows,
    discountBuckets,
    floorRowsSorted,
    termRowsSorted,
    summaryBadges: ["Excel-формат", "USD"],
  };
}

/* ═══════════════════════════════════════════
   UI components (збережені)
   ═══════════════════════════════════════════ */

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="glass-outpress-edge p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex h-10 w-10 items-center justify-center text-primary">{icon}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
          <div className="min-w-0">
            <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-market-row rounded-3xl glass-pressed-edge p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function lerpColor(from: string, to: string, t: number) {
  const clampedT = Math.max(0, Math.min(1, t));

  const fromHex = from.replace("#", "");
  const toHex = to.replace("#", "");

  const fromR = parseInt(fromHex.slice(0, 2), 16);
  const fromG = parseInt(fromHex.slice(2, 4), 16);
  const fromB = parseInt(fromHex.slice(4, 6), 16);

  const toR = parseInt(toHex.slice(0, 2), 16);
  const toG = parseInt(toHex.slice(2, 4), 16);
  const toB = parseInt(toHex.slice(4, 6), 16);

  const r = Math.round(fromR + (toR - fromR) * clampedT);
  const g = Math.round(fromG + (toG - fromG) * clampedT);
  const b = Math.round(fromB + (toB - fromB) * clampedT);

  return `rgb(${r}, ${g}, ${b})`;
}

function ProgressRow({
  label,
  value,
  total,
  index = 0,
  count = 1,
}: {
  label: string;
  value: number;
  total: number;
  index?: number;
  count?: number;
}) {
  const width = total ? Math.round((value / total) * 100) : 0;
  const safeWidth = Math.max(0, Math.min(100, width));

  const t = count > 1 ? index / (count - 1) : 0;

  const topColor = lerpColor("#8b5cf6", "#06b6d4", t);
  const bottomColor = lerpColor("#6d28d9", "#0891b2", t);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {fmtNumber(value)} / {fmtNumber(total)}
        </span>
      </div>

      <div className="h-4 overflow-hidden rounded-[2px_8px_8px_2px] bg-muted">
        <div
          className="h-full rounded-[2px_8px_8px_2px]"
          style={{
            width: `${safeWidth}%`,
            background: `linear-gradient(90deg, ${topColor} 0%, ${bottomColor} 100%)`,
            opacity: 0.95,
          }}
        />
      </div>
    </div>
  );
}

function Leaderboard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { label: string; value: number }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card className="surface">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rows.length ? <div className="text-sm text-muted-foreground">{empty}</div> : null}
        {rows.map((row) => (
          <div key={row.label} className="surface rounded-[0.9rem] px-4 py-3">
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">{fmtNumber(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   Utils
   ═══════════════════════════════════════════ */

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
  const nums = values
    .map(Number)
    .filter(isFiniteNumber)
    .sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
