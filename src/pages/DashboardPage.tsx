import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { fmtMoney, fmtNumber } from "@/lib/format";
import { TrendingUp, Home, Calendar, Percent, Activity, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";

export function DashboardPage() {
  const summary = useQuery({ queryKey: ["summary"], queryFn: () => api<any>("/api/analytics/summary") });
  const dyn = useQuery({ queryKey: ["dyn"], queryFn: () => api<any>("/api/analytics/price-dynamics") });
  const districts = useQuery({ queryKey: ["d"], queryFn: () => api<any>("/api/analytics/districts") });

  const s = summary.data ?? {};

  return (
    <PageShell>
      <PageHeader title="Дашборд" description="Зведена аналітика ринку м. Кропивницький" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard title="Підтверджені продажі" value={fmtNumber(s.total)} icon={<Home className="h-4 w-4" />} />
        <StatCard title="Середня ціна" value={fmtMoney(s.avg_price)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Медіанна ціна" value={fmtMoney(s.median_price)} icon={<Activity className="h-4 w-4" />} />
        <StatCard title="Середня за м²" value={fmtMoney(s.avg_price_per_m2)} icon={<Building className="h-4 w-4" />} />
        <StatCard title="За 30 днів" value={fmtNumber(s.last_30_days)} icon={<Calendar className="h-4 w-4" />} />
        <StatCard title="Середній торг" value={s.avg_discount_percent != null ? `${fmtNumber(s.avg_discount_percent, 1)}%` : "—"} icon={<Percent className="h-4 w-4" />} />
        <StatCard title="Топ район" value={s.top_districts?.[0]?.district ?? "—"} hint={s.top_districts?.[0] ? `${s.top_districts[0].count} продажів` : undefined} />
        <StatCard title="Топ кімнат" value={s.top_rooms ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Динаміка середньої ціни</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart data={dyn.data?.data ?? []}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="avg_price" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Продажі по районах</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={districts.data?.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="district" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
