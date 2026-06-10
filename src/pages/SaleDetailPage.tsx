import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney, fmtArea, propertyTypeLabel, statusLabel } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === "superuser" || user?.role === "admin" || user?.role === "moderator";
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => api<{ sale: any }>(`/api/sales/${id}`),
    enabled: !!id,
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
      toast.success("Видалено"); navigate("/sales");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PageShell>
      <PageHeader title={`${propertyTypeLabel(s.property_type)} — ${s.district}`}>
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
              <dt className="text-muted-foreground">Тип</dt><dd>{s.building_type ?? "—"}</dd>
              <dt className="text-muted-foreground">Земля</dt><dd>{s.land_area ?? "—"}</dd>
              <dt className="text-muted-foreground">Комунікації</dt><dd>{s.communications ?? "—"}</dd>
              <dt className="text-muted-foreground">Зручності</dt><dd>{s.amenities ?? "—"}</dd>
              <dt className="text-muted-foreground">Стан</dt><dd>{s.condition ?? "—"}</dd>
              <dt className="text-muted-foreground">Меблі/техніка</dt><dd>{s.furniture ?? "—"}</dd>
              <dt className="text-muted-foreground">Термін</dt><dd>{s.sale_term ?? "—"}</dd>
              <dt className="text-muted-foreground">Початкова ціна</dt><dd>{s.initial_price ? fmtMoney(s.initial_price, s.currency) : "—"}</dd>
            </dl>
            {s.comment && (<><div className="mt-4 text-xs text-muted-foreground">Коментар</div><div className="text-sm mt-1">{s.comment}</div></>)}
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
              {(user?.role === "superuser" || user?.role === "admin") && <Button variant="destructive" onClick={del}>Видалити</Button>}
            </CardContent>
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
