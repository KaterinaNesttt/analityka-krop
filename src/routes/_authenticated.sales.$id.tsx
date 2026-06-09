import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney, fmtArea, propertyTypeLabel, sourceLabel, statusLabel } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sales/$id")({
  component: SaleDetail,
});

function SaleDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => api<{ sale: any }>(`/api/sales/${id}`),
  });
  const districtsQ = useQuery({
    queryKey: ["d-cmp"],
    queryFn: () => api<{ data: any[] }>("/api/analytics/districts"),
  });
  const roomsQ = useQuery({
    queryKey: ["r-cmp"],
    queryFn: () => api<{ data: any[] }>("/api/analytics/rooms"),
  });

  if (isLoading) return <PageShell><div className="text-muted-foreground">Завантаження…</div></PageShell>;
  if (!data?.sale) return <PageShell><div className="text-muted-foreground">Запис не знайдено</div></PageShell>;

  const s = data.sale;
  const ppm = s.total_area ? s.final_price / s.total_area : null;
  const districtAvg = districtsQ.data?.data.find((d) => d.district === s.district);
  const roomsAvg = roomsQ.data?.data.find((d) => d.rooms === s.rooms);

  const moderate = async (action: "approve" | "reject" | "duplicate") => {
    try {
      await api(`/api/sales/${id}/${action}`, { method: "PATCH" });
      toast.success("Статус оновлено");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  };
  const del = async () => {
    if (!confirm("Видалити запис?")) return;
    try {
      await api(`/api/sales/${id}`, { method: "DELETE" });
      toast.success("Видалено"); navigate({ to: "/sales" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PageShell>
      <PageHeader title={`${propertyTypeLabel(s.property_type)} — ${s.district}`} description={s.address_hint ?? "Без адреси"}>
        <Badge variant={s.status === "approved" ? "default" : "secondary"}>{statusLabel(s.status)}</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard title="Ціна" value={fmtMoney(s.final_price, s.currency)} />
        <StatCard title="Ціна за м²" value={fmtMoney(ppm, s.currency)} />
        <StatCard title="Площа" value={fmtArea(s.total_area)} />
        <StatCard title="Дата" value={fmtDate(s.sale_date)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Характеристики</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Кімнат</dt><dd>{s.rooms ?? "—"}</dd>
              <dt className="text-muted-foreground">Поверх</dt><dd>{s.floor ? `${s.floor}/${s.floors_total ?? "?"}` : "—"}</dd>
              <dt className="text-muted-foreground">Житлова площа</dt><dd>{fmtArea(s.living_area)}</dd>
              <dt className="text-muted-foreground">Кухня</dt><dd>{fmtArea(s.kitchen_area)}</dd>
              <dt className="text-muted-foreground">Тип будинку</dt><dd>{s.building_type ?? "—"}</dd>
              <dt className="text-muted-foreground">Стан</dt><dd>{s.condition ?? "—"}</dd>
              <dt className="text-muted-foreground">Рік побудови</dt><dd>{s.year_built ?? "—"}</dd>
              <dt className="text-muted-foreground">Джерело</dt><dd>{sourceLabel(s.source_type)}</dd>
              <dt className="text-muted-foreground">Початкова ціна</dt><dd>{s.initial_price ? fmtMoney(s.initial_price, s.currency) : "—"}</dd>
              <dt className="text-muted-foreground">Торг</dt><dd>{s.discount_percent != null ? `${Number(s.discount_percent).toFixed(1)}% (${fmtMoney(s.discount_amount, s.currency)})` : "—"}</dd>
            </dl>
            {s.comment && (<><div className="mt-4 text-xs text-muted-foreground">Коментар</div><div className="text-sm mt-1">{s.comment}</div></>)}
            {s.listing_url && (<div className="mt-3"><a href={s.listing_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">Посилання на оголошення</a></div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Порівняння</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <CompareRow label={`Середня ціна за м² в районі «${s.district}»`} target={ppm} other={districtAvg?.avg_price_per_m2} currency={s.currency} />
            <CompareRow label={`Середня ціна за м² для ${s.rooms ?? "?"}-к`} target={ppm} other={roomsAvg?.avg_price_per_m2} currency={s.currency} />
            <CompareRow label={`Середня ціна в районі`} target={s.final_price} other={districtAvg?.avg_price} currency={s.currency} />
          </CardContent>
        </Card>

        {isStaff && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Модерація</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => moderate("approve")}>Підтвердити</Button>
              <Button variant="outline" onClick={() => moderate("reject")}>Відхилити</Button>
              <Button variant="outline" onClick={() => moderate("duplicate")}>Дублікат</Button>
              {user?.role === "admin" && <Button variant="destructive" onClick={del}>Видалити</Button>}
            </CardContent>
            {s.source_text && (
              <CardContent>
                <div className="text-xs text-muted-foreground mb-1">Сирий текст джерела</div>
                <pre className="text-xs bg-muted p-3 rounded-md whitespace-pre-wrap">{s.source_text}</pre>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function CompareRow({ label, target, other, currency }: { label: string; target: number | null; other: number | null | undefined; currency: string }) {
  if (target == null || other == null) return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>—</span></div>;
  const diff = ((target - other) / other) * 100;
  const sign = diff > 0 ? "+" : "";
  const cls = Math.abs(diff) < 3 ? "text-muted-foreground" : diff > 0 ? "text-warning" : "text-success";
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span>{fmtMoney(other, currency)}</span>
        <span className={`ml-2 text-xs ${cls}`}>{sign}{diff.toFixed(1)}%</span>
      </span>
    </div>
  );
}
