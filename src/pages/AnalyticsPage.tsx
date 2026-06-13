import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { FiltersBar, type SalesFilters } from "@/components/filters-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtNumber } from "@/lib/format";
import {
  BadgeDollarSign,
  DoorOpen,
  MapPinned,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
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

export function AnalyticsPage() {
  const [filters, setFilters] = useState<SalesFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sales = useQuery({
    queryKey: ["approved-sales", filters, "created_at_desc"],
    queryFn: () =>
      api<{ sales: Sale[] }>("/api/sales", {
        query: { status: "approved", ...filters, limit: 1000, sort: "created_at_desc" },
      }),
  });

  const data = useMemo(
    () => buildAnalytics(sales.data?.sales ?? [], filters),
    [sales.data, filters],
  );

  return (
    <PageShell>
      <PageHeader title="Аналітика">
        <Button
          variant={filtersOpen ? "default" : "outline"}
          size="sm"
          className="surface-upgrade border-0 text-foreground shadow-none hover:text-primary-foreground"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Фільтр
        </Button>
      </PageHeader>

      {filtersOpen && (
        <Card className="surface-secondary glass-edge inset-surface mb-5 rounded-[1.25rem] p-4">
          <FiltersBar value={filters} onChange={setFilters} frameless />
        </Card>
      )}

      {sales.isLoading ? (
        <LoadingGrid />
      ) : !data.total ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            За цими фільтрами немає підтверджених продажів.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Hero */}
          <section className="mb-5 grid gap-4 xl:grid-cols-[1fr_0.7fr]">
            <Card className="overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Поточна вибірка</div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                      <span className="text-5xl font-semibold tabular-nums">
                        {fmtNumber(data.total)}
                      </span>
                      <span className="text-lg text-muted-foreground">угод</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.activeFilterLabels.length ? (
                      data.activeFilterLabels.map((label) => (
                        <Badge key={label} variant="secondary" className="rounded-md">
                          {label}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="rounded-md">
                        Усі дані
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <SummaryCell label="Медіанна ціна" value={fmtMoney(data.medianPrice)} />
                  <SummaryCell label="Середня ціна" value={fmtMoney(data.avgPrice)} />
                  <SummaryCell
                    label="Діапазон"
                    value={`${fmtMoney(data.minPrice)} - ${fmtMoney(data.maxPrice)}`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="surface-alpha">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Швидка статистика</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InsightLine
                  icon={<MapPinned className="h-4 w-4" />}
                  label="Локацій"
                  value={`${fmtNumber(data.locationCount)} позицій`}
                />
                <InsightLine
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  label="Зі стартовою ціною"
                  value={`${fmtNumber(data.withInitialPrice)} угод`}
                />
                <InsightLine
                  icon={<TrendingDown className="h-4 w-4" />}
                  label="Середній торг"
                  value={data.avgDiscount == null ? "—" : `${fmtNumber(data.avgDiscount, 1)}%`}
                />
              </CardContent>
            </Card>
          </section>

          {/* Метрики */}
          <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<BadgeDollarSign className="h-5 w-5" />}
              label="Середня ціна"
              value={fmtMoney(data.avgPrice)}
            />
            <Metric
              icon={<MapPinned className="h-5 w-5" />}
              label="Найактивніший"
              value={data.topDistrict?.label ?? "—"}
            />
            <Metric
              icon={<DoorOpen className="h-5 w-5" />}
              label="Найчастіший поверх"
              value={data.topFloor?.label ?? "—"}
            />
            <Metric
              icon={<SlidersHorizontal className="h-5 w-5" />}
              label="Без ціни продажу"
              value={fmtNumber(data.withoutFinalPrice)}
            />
          </section>

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
        </>
      )}
    </PageShell>
  );
}

/* ═══════════════════════════════════════════
   Data builder
   ═══════════════════════════════════════════ */

function buildAnalytics(rows: Sale[], filters: SalesFilters) {
  const total = rows.length;
  const prices = rows.map((sale) => sale.final_price).filter(isFiniteNumber);
  const withInitialPrice = rows.filter(
    (sale) => isFiniteNumber(sale.initial_price) && Number(sale.initial_price) > 0,
  ).length;
  const discountValues = rows
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

  // Цінові коридори — кожна угода, БЕЗ сортування
  const pricePoints: PricePoint[] = rows.map((sale, i) => ({
    idx: i + 1,
    initialPrice:
      isFiniteNumber(sale.initial_price) && Number(sale.initial_price) > 0
        ? Number(sale.initial_price)
        : null,
    finalPrice: isFiniteNumber(sale.final_price) ? Number(sale.final_price) : null,
  }));

  // Райони — БЕЗ сортування для графіку
  const allDistrictRows: ChartItem[] = Object.values(groupBy(rows, (sale) => sale.district)).map(
    (items) => ({
      label: items[0].district,
      value: items.length,
    }),
  );
  const districtRows = allDistrictRows.slice(0, 8);
  const districtRowsSorted = [...allDistrictRows].sort((a, b) => b.value - a.value).slice(0, 9);

  // Поверхи — БЕЗ сортування
  const floorRows: ChartItem[] = Object.values(
    groupBy(
      rows
        .map((sale) => ({ ...sale, floor: sale.floor?.split("/")[0].trim() || null }))
        .filter((sale) => sale.floor),
      (sale) => sale.floor || "Не вказано",
    ),
  ).map((items) => ({
    label: items[0].floor || "Не вказано",
    value: items.length,
  }));
  const floorRowsSorted = [...floorRows].sort((a, b) => b.value - a.value).slice(0, 6);

  // Термін — БЕЗ сортування
  const termRows: ChartItem[] = Object.values(
    groupBy(
      rows.filter((sale) => sale.sale_term),
      (sale) => sale.sale_term || "Не вказано",
    ),
  ).map((items) => ({
    label: items[0].sale_term || "Не вказано",
    value: items.length,
  }));
  const termRowsSorted = [...termRows].sort((a, b) => b.value - a.value).slice(0, 6);

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

  return {
    total,
    withInitialPrice,
    withoutFinalPrice: total - prices.length,
    locationCount: Object.keys(groupBy(rows, (sale) => sale.district)).length,
    avgPrice: average(prices),
    medianPrice: median(prices),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    avgDiscount: average(discountValues),
    activeFilterLabels: filterLabels(filters),
    topDistrict: districtRowsSorted[0],
    topFloor: floorRowsSorted[0],
    pricePoints,
    districtRows,
    allDistrictRows,
    districtRowsSorted,
    floorRows,
    floorRowsSorted,
    termRows,
    termRowsSorted,
    discountBuckets,
  };
}

/* ═══════════════════════════════════════════
   UI components (збережені)
   ═══════════════════════════════════════════ */

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="glass-outpress-edge p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex h-6 w-6 items-center justify-center text-primary">{icon}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
          <div className="min-w-0">
            <div className="mt-2 text-lg font-semibold tabular-nums">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-market-row glass-pressed-edge inset-surface rounded-[1.25rem] p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function InsightLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="surface-market-row glass-pressed-edge flex items-center justify-between gap-3 rounded-[1.4rem] px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function Leaderboard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <Card className="surface-alpha">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rows.length ? <div className="text-sm text-muted-foreground">{empty}</div> : null}
        {rows.map((row) => (
          <div key={row.label} className="surface-market-row rounded-[1.4rem] px-4 py-3">
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

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="surface-stat h-36 rounded-[1.65rem] animate-pulse" />
      ))}
    </div>
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

function filterLabels(filters: SalesFilters): string[] {
  const labels: string[] = [];
  if (filters.district) labels.push(filters.district);
  if (filters.price_min) labels.push(`ціна від ${fmtMoney(Number(filters.price_min))}`);
  if (filters.price_max) labels.push(`ціна до ${fmtMoney(Number(filters.price_max))}`);
  return labels;
}
