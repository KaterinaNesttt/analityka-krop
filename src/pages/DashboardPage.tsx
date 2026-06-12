import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LabelList, type LabelProps } from "recharts";
import { Activity, AreaChart as AreaIcon, Building2, Home, KeyRound, MapPin, PiggyBank, Scale3D } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Sale = {
  id: string;
  property_type: string;
  district: string;
  rooms: number | null;
  total_area: number | null;
  building_type: string | null;
  initial_price: number | null;
  final_price: number;
  currency: string;
  sale_date: string;
  status: string;
};

type TooltipRow = { label: string; value: string };

const renderDistrictLabel = ({ x, y, width, height, value }: LabelProps) => {
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return null;
  }

  const label = shortLabel(String(value ?? ""));

  const labelX = x - 8;          // лівіше від бара
  const labelY = y + height - 2; // старт з самого низу бара

  return (
    <text
      x={labelX}
      y={labelY}
      textAnchor="start"
      dominantBaseline="middle"
      transform={`rotate(-90 ${labelX} ${labelY})`}
      fill="var(--color-muted-foreground)"
      fontSize={10}
      fontWeight={700}
      pointerEvents="none"
    >
      {label}
    </text>
  );
};

const TYPE_LABELS: Record<string, string> = {
  apartment: "Квартири",
  house: "Будинки",
};

const TYPE_COLORS: Record<string, string> = {
  apartment: "#d4a84f",
  house: "#87946a",
};

const BUCKETS = [
  { label: "до $30k", min: 0, max: 30000 },
  { label: "$30k-$50k", min: 30000, max: 50000 },
  { label: "$50k-$70k", min: 50000, max: 70000 },
  { label: "$70k-$100k", min: 70000, max: 100000 },
  { label: "$100k+", min: 100000, max: Infinity },
];

export function DashboardPage() {
  const sales = useQuery({
    queryKey: ["approved-sales", {}, "sale_date_desc"],
    queryFn: () => api<{ sales: Sale[] }>("/api/sales", { query: { status: "approved", limit: 1000, sort: "sale_date_desc" } }),
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
          <CardContent className="p-10 text-center text-muted-foreground">Немає підтверджених продажів для аналізу.</CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mb-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className ="surface-primary bg-secondary glass-edge p-1 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              
                <div className="text-sm text-muted-foreground">Підтверджена база</div>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <span className="text-4xl font-semibold tabular-nums">{fmtNumber(data.total)}</span>
                  <span className="text-lg text-muted-foreground">угод</span>
                </div>
              
            </div>
            <div className="flex flex-wrap gap-2">
              {data.yearBadges.map((item) => (
                <Badge key={item} variant="secondary" className="rounded-md">{item}</Badge>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroFact label="Середня ціна" value={fmtMoney(data.avgPrice)} />
            <HeroFact label="Медіана" value={fmtMoney(data.medianPrice)} />
            <HeroFact label="Площа є у базі" value={`${fmtNumber(data.areaCoverage)}%`} />
          </div>
        </Card>
        

        <Card className="surface-upgrade">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Якість даних</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressRow label="З площою" value={data.withArea} total={data.total} />
            <ProgressRow label="Зі стартовою ціною" value={data.withInitialPrice} total={data.total} />
            <ProgressRow label="Без ручної модерації" value={data.approved} total={data.total} />
          </CardContent>
        </Card>
      </section>

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Building2 className="h-5 w-5" />} label="Квартири" value={fmtNumber(data.apartments.count)} hint={""} />
        <MetricCard icon={<Home className="h-5 w-5" />} label="Будинки" value={fmtNumber(data.houses.count)} hint={""} />
        <MetricCard icon={<AreaIcon className="h-5 w-5" />} label="Середня за м²" value={fmtMoney(data.avgPricePerM2)} hint={""} />
        <MetricCard icon={<PiggyBank className="h-5 w-5" />} label="Середній торг" value={data.avgDiscount == null ? "—" : `${fmtNumber(data.avgDiscount, 1)}%`} hint={""} />
      </div>

      <section className="mb-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="surface-gas-shell ">
          <CardHeader className="px-3 pb-1 pt-5">
            <CardTitle className="text-base text-center text-muted-foreground md:text-lg">Склад бази</CardTitle>
          </CardHeader>
          <CardContent className="h-62 p-2 pt-0">
            <ResponsiveContainer>
              <BarChart data={data.typeData} layout="vertical" margin={{ top: 14, right: 14, bottom: 14, left: 2 }}>
                {renderChartVolumeDefs({ id: "dashType", colors: TYPE_COLORS, direction: "horizontal" })}
                <CartesianGrid strokeDasharray="2 7" horizontal={false} stroke="rgba(255,255,255,0.07)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} width={82} axisLine={false} tickLine={false} />
                <Tooltip cursor={false} content={<CleanTooltip />} />
                <Bar dataKey="count" barSize={30} radius={[0, 18, 18, 0]} >
                  {data.typeData.map((entry) => <Cell key={entry.key} fill={`url(#dashType-${entry.key})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface-flow bg-secondary">
          <CardHeader className="px-6 pb-1 pt-6">
            <CardTitle className="text-base text-center text-muted-foreground">Найактивніші локації</CardTitle>
          </CardHeader>

          <CardContent className="h-62 p-2 pt-0">
            <ResponsiveContainer>
              <BarChart
                data={data.topDistricts}
                layout="horizontal"
                margin={{ top: 14, right: 34, bottom: 6, left: 1 }}
              >
                {renderChartVolumeDefs({
                  id: "dashDistrict",
                  colors: { count: "#d4a84f" },
                  direction: "horizontal",
                })}

                <CartesianGrid
                  strokeDasharray="2 7"
                  horizontal={false}
                  stroke="rgba(255,255,255,0.07)"
                />

                <YAxis
                  type="number"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />

                <XAxis
                  type="category"
                  dataKey="district"
                  hide
                />

                <Tooltip cursor={false} content={<CleanTooltip />} />

                <Bar
                  dataKey="count"
                  fill="url(#dashDistrict-count)"
                  barSize={24}
                  radius={[18, 18, 0, 0]}
                >
                  <LabelList
                    dataKey="district"
                    content={renderDistrictLabel}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="mb-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="surface-flow">
          <CardHeader className="px-2 pb-1 pt-8">
            <CardTitle className="text-base text-center text-muted-foreground">Цінові коридори</CardTitle>
          </CardHeader>
          <CardContent className="h-62 p-1 pt-0">
            <ResponsiveContainer>
              <AreaChart data={data.priceBuckets} margin={{ top: 16, right: 30, bottom: 12, left: 0 }}>
                {renderChartAreaDefs({ id: "dashPrice", color: "#d4a84f" })}
                <CartesianGrid strokeDasharray="2 7" vertical={false} stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: "#d4a84f", strokeWidth: 1, strokeOpacity: 0.35 }} content={<CleanTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#d4a84f" fill="url(#dashPrice-area)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <InsightCard icon={<MapPin className="h-5 w-5" />} title="Найбільше продажів" value={data.topDistrict?.district ?? "—"} hint={data.topDistrict ? `${fmtNumber(data.topDistrict.count)} угод` : "Немає даних"} />
          <InsightCard icon={<KeyRound className="h-5 w-5" />} title="Найчастіша кімнатність" value={data.topRooms ? `${data.topRooms.rooms}-к` : "—"} hint={data.topRooms ? `${fmtNumber(data.topRooms.count)} квартир` : "Немає даних"} />
          <InsightCard icon={<Scale3D className="h-5 w-5" />} title="Середня площа" value={`${fmtNumber(data.avgArea, 1)} м²`} hint="рахується тільки там, де площа вказана" />
          <InsightCard icon={<Activity className="h-5 w-5" />} title="Без площі" value={fmtNumber(data.total - data.withArea)} hint="такі записи не входять у ціну за м²" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Leaderboard title="Типи будинків" rows={data.houseTypes} empty="У будинках не заповнено тип." />
        <Leaderboard title="Кімнатність квартир" rows={data.roomRows} empty="У квартирах не заповнено кімнатність." />
      </section>
    </PageShell>
  );
}

function buildDashboardData(input: Sale[]) {
  const rows = input.filter((sale) => sale.status === "approved");
  const total = rows.length;
  const prices = rows.map((sale) => Number(sale.final_price)).filter(isFiniteNumber);
  const areaRows = rows.filter((sale) => isFiniteNumber(sale.total_area) && Number(sale.total_area) > 0);
  const withInitialPrice = rows.filter((sale) => isFiniteNumber(sale.initial_price) && Number(sale.initial_price) > 0).length;
  const discounts = rows
    .filter((sale) => isFiniteNumber(sale.initial_price) && Number(sale.initial_price) > 0)
    .map((sale) => ((Number(sale.initial_price) - Number(sale.final_price)) / Number(sale.initial_price)) * 100);
  const apartments = rows.filter((sale) => sale.property_type === "apartment");
  const houses = rows.filter((sale) => sale.property_type === "house");
  const years = Array.from(new Set(rows.map((sale) => sale.sale_date?.slice(0, 4)).filter(Boolean))).sort();

  const typeData = ["apartment", "house"].map((type) => {
    const typeRows = rows.filter((sale) => sale.property_type === type);
    return {
      key: type,
      label: TYPE_LABELS[type] ?? type,
      count: typeRows.length,
      color: TYPE_COLORS[type] ?? "#d4a84f",
      tooltipRows: [
        { label: "Угоди", value: fmtNumber(typeRows.length) },
        { label: "Середня ціна", value: fmtMoney(average(typeRows.map((sale) => sale.final_price))) },
        { label: "Медіана", value: fmtMoney(median(typeRows.map((sale) => sale.final_price))) },
      ],
    };
  }).filter((item) => item.count > 0);

  const districtData = Object.values(groupBy(rows, (sale) => sale.district)).map((districtRows) => {
    const first = districtRows[0];
    const ppm = districtRows
      .filter((sale) => isFiniteNumber(sale.total_area) && Number(sale.total_area) > 0)
      .map((sale) => Number(sale.final_price) / Number(sale.total_area));
    return {
      district: first.district,
      count: districtRows.length,
      tooltipRows: [
        { label: "Продажі", value: fmtNumber(districtRows.length) },
        { label: "Середня ціна", value: fmtMoney(average(districtRows.map((sale) => sale.final_price))) },
        { label: "Середня за м²", value: fmtMoney(average(ppm)) },
      ],
    };
  });

  const topDistrictsRanked = [...districtData].sort((a, b) => b.count - a.count).slice(0, 8);
  const topDistricts = [...topDistrictsRanked].sort((a, b) => stableMixedKey(a.district) - stableMixedKey(b.district));

  const priceBuckets = BUCKETS.map((bucket) => {
    const bucketRows = rows.filter((sale) => sale.final_price >= bucket.min && sale.final_price < bucket.max);
    return {
      label: bucket.label,
      count: bucketRows.length,
      tooltipRows: [
        { label: "Угоди", value: fmtNumber(bucketRows.length) },
        { label: "Середня ціна", value: fmtMoney(average(bucketRows.map((sale) => sale.final_price))) },
      ],
    };
  });

  const houseTypes = Object.values(groupBy(houses, (sale) => sale.building_type || "Не вказано"))
    .map((items) => ({ label: items[0].building_type || "Не вказано", value: items.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const roomRows = Object.values(groupBy(apartments.filter((sale) => sale.rooms), (sale) => String(sale.rooms)))
    .map((items) => ({ label: `${items[0].rooms}-к`, value: items.length }))
    .sort((a, b) => b.value - a.value);

  return {
    total,
    approved: rows.length,
    avgPrice: average(prices),
    medianPrice: median(prices),
    avgPricePerM2: average(areaRows.map((sale) => Number(sale.final_price) / Number(sale.total_area))),
    avgArea: average(areaRows.map((sale) => Number(sale.total_area))),
    avgDiscount: average(discounts),
    withArea: areaRows.length,
    withInitialPrice,
    areaCoverage: total ? (areaRows.length / total) * 100 : 0,
    apartments: { count: apartments.length, avgPrice: average(apartments.map((sale) => sale.final_price)) },
    houses: { count: houses.length, avgPrice: average(houses.map((sale) => sale.final_price)) },
    topDistricts,
    topDistrict: topDistrictsRanked[0],
    topRooms: roomRows[0] ? { rooms: roomRows[0].label.replace("-к", ""), count: roomRows[0].value } : null,
    typeData,
    priceBuckets,
    houseTypes,
    roomRows,
    yearBadges: years.length ? years.map((year) => `${year} рік`) : ["Без дати"],
  };
}

function MetricCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card className="surface-vault overflow-hidden">
      <CardContent className="glass-outpress-edge p-3">
        <div className=" flex items-start justify-between  gap-3">
          <div>
          <div className=" flex h-10 w-10 items-center justify-center text-primary">{icon}</div>
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

function renderChartVolumeDefs({ id, colors, direction }: { id: string; colors: Record<string, string>; direction: "horizontal" | "vertical" }) {
  const horizontal = direction === "horizontal";
  return (
    <defs>
      {Object.entries(colors).map(([key, color]) => (
        <linearGradient key={key} id={`${id}-${key}`} x1="0" y1="0" x2={horizontal ? "1" : "0"} y2={horizontal ? "0" : "1"}>
          <stop offset="0%" stopColor={color} stopOpacity={0.62} />
          <stop offset="38%" stopColor={color} stopOpacity={0.92} />
          <stop offset="70%" stopColor={color} stopOpacity={0.78} />
          <stop offset="100%" stopColor={color} stopOpacity={0.48} />
        </linearGradient>
      ))}
    </defs>
  );
}

function renderChartAreaDefs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.62} />
        <stop offset="48%" stopColor={color} stopOpacity={0.22} />
        <stop offset="100%" stopColor={color} stopOpacity={0.03} />
      </linearGradient>
    </defs>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-market-row rounded-3xl  glass-pressed-edge p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ProgressRow({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{fmtNumber(value)} / {fmtNumber(total)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function InsightCard({ icon, title, value, hint }: { icon: ReactNode; title: string; value: string; hint: string }) {
  return (
    <Card className="surface-market">
      <CardContent className="p-4 flex justify-between">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm">{title}</span>
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>

      </CardContent>
    </Card>
  );
}

function Leaderboard({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
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
              <div className="h-full rounded-full bg-primary/80" style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CleanTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: { tooltipRows?: TooltipRow[] } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const rows = payload[0]?.payload?.tooltipRows ?? [];
  return (
    <div className="glass-edge rounded-2xl bg-popover/95 px-3 py-2 text-sm">
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

function groupBy<T>(rows: T[], getKey: (row: T) => string): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = getKey(row);
    (acc[key] ??= []).push(row);
    return acc;
  }, {});
}

function stableMixedKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
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
