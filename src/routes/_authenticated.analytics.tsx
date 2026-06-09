import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { FiltersBar, type SalesFilters } from "@/components/filters-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const TOOLTIP = { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 };

function AnalyticsPage() {
  const [filters, setFilters] = useState<SalesFilters>({});
  const q = (path: string) => ({ ...filters });
  const dyn = useQuery({ queryKey: ["a-dyn", filters], queryFn: () => api<any>("/api/analytics/price-dynamics", { query: q("") }) });
  const ppm = useQuery({ queryKey: ["a-ppm", filters], queryFn: () => api<any>("/api/analytics/price-per-m2", { query: q("") }) });
  const dist = useQuery({ queryKey: ["a-dist", filters], queryFn: () => api<any>("/api/analytics/districts", { query: q("") }) });
  const rooms = useQuery({ queryKey: ["a-rooms", filters], queryFn: () => api<any>("/api/analytics/rooms", { query: q("") }) });
  const distr = useQuery({ queryKey: ["a-distr", filters], queryFn: () => api<any>("/api/analytics/distribution", { query: q("") }) });
  const disc = useQuery({ queryKey: ["a-disc", filters], queryFn: () => api<any>("/api/analytics/discounts", { query: q("") }) });

  return (
    <PageShell>
      <PageHeader title="Аналітика" description="Графіки реагують на фільтри." />
      <div className="mb-4"><FiltersBar value={filters} onChange={setFilters} /></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Середня ціна по місяцях">
          <AreaChart data={dyn.data?.data ?? []}>
            <defs><linearGradient id="ga1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Area type="monotone" dataKey="avg_price" stroke="var(--color-chart-1)" fill="url(#ga1)" strokeWidth={2} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Ціна за м² по місяцях">
          <LineChart data={ppm.data?.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Line type="monotone" dataKey="avg_price_per_m2" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Продажі по районах">
          <BarChart data={dist.data?.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="district" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Bar dataKey="count" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Середня ціна за м² по районах">
          <BarChart data={dist.data?.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="district" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Bar dataKey="avg_price_per_m2" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Продажі по кількості кімнат">
          <BarChart data={rooms.data?.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="rooms" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Bar dataKey="count" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Розподіл цін">
          <BarChart data={distr.data?.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="range" stroke="var(--color-muted-foreground)" fontSize={10} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Bar dataKey="count" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Розподіл торгу (%)">
          <BarChart data={disc.data?.distribution ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="bucket" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Bar dataKey="count" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Кількість продажів у часі">
          <BarChart data={dyn.data?.data ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={TOOLTIP} />
            <Bar dataKey="count" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </PageShell>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
