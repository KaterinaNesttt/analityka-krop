import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, statusLabel } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isStaff = user?.role === "superuser" || user?.role === "admin" || user?.role === "moderator";
  const { data, isLoading } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => api<{ sale: any }>(`/api/sales/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <PageShell><div className="text-muted-foreground">Завантаження…</div></PageShell>;
  if (!data?.sale) return <PageShell><div className="text-muted-foreground">Запис не знайдено</div></PageShell>;

  const s = data.sale;

  const moderate = async (action: "approve" | "reject" | "duplicate") => {
    try {
      await api(`/api/sales/${id}/${action}`, { method: "PATCH" });
      toast.success("Статус оновлено");
      const status = action === "approve" ? "approved" : action;
      queryClient.setQueryData<{ sale: any }>(["sale", id], (current) => current ? { ...current, sale: { ...current.sale, status } } : current);
      queryClient.invalidateQueries({ queryKey: ["sales"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["approved-sales"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["mod-list"], refetchType: "none" });
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
      <PageHeader title={s.district}>
        <Badge variant={s.status === "approved" ? "default" : "secondary"}>{statusLabel(s.status)}</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard title="Продаж ціна" value={fmtMoney(s.final_price)} />
        <StatCard title="Старт ціна" value={fmtMoney(s.initial_price)} />
        <StatCard title="Термін" value={s.sale_term ?? "—"} />
        <StatCard title="Статус" value={statusLabel(s.status)} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Деталі продажу</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Район/ЖК</dt><dd>{s.district}</dd>
              <dt className="text-muted-foreground">Поверх</dt><dd>{s.floor ?? "—"}</dd>
              <dt className="text-muted-foreground">Термін</dt><dd>{s.sale_term ?? "—"}</dd>
              <dt className="text-muted-foreground">Початкова ціна</dt><dd>{fmtMoney(s.initial_price)}</dd>
              <dt className="text-muted-foreground">Продаж ціна</dt><dd>{fmtMoney(s.final_price)}</dd>
            </dl>
            {s.characteristics && (<><div className="mt-4 text-xs text-muted-foreground">Характеристика</div><div className="text-sm mt-1 whitespace-pre-wrap">{s.characteristics}</div></>)}
            {s.comment && (<><div className="mt-4 text-xs text-muted-foreground">Коментар</div><div className="text-sm mt-1">{s.comment}</div></>)}
          </CardContent>
        </Card>

        {isStaff && (
          <Card>
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
