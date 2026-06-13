import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isNetworkError } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney, statusLabel } from "@/lib/format";
import { toast } from "sonner";

export function ModerationPage() {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["mod-list"],
    queryFn: () => api<{ sales: any[] }>("/api/sales", { query: { status: "pending" } }),
  });

  const act = async (id: string, action: "approve" | "reject" | "duplicate") => {
    try {
      await api(`/api/sales/${id}/${action}`, { method: "PATCH" });
      toast.success("Готово");
      queryClient.setQueryData<{ sales: any[] }>(["mod-list"], (current) => current ? { ...current, sales: current.sales.filter((sale) => sale.id !== id) } : current);
      const status = action === "approve" ? "approved" : action;
      queryClient.setQueryData<{ sale: any }>(["sale", id], (current) => current ? { ...current, sale: { ...current.sale, status } } : current);
      queryClient.invalidateQueries({ queryKey: ["sales"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["approved-sales"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["mod-list"], refetchType: "none" });
    } catch (e: any) { toast.error(isNetworkError(e) ? "Модерація доступна лише онлайн" : e.message); }
  };

  return (
    <PageShell>
      <PageHeader title="Модерація" />

      <div className="space-y-3">
        {q.isLoading && <div className="text-muted-foreground">Завантаження…</div>}
        {!q.isLoading && (q.data?.sales.length ?? 0) === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Немає записів на перевірці</CardContent></Card>
        )}
        {q.data?.sales.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{statusLabel(r.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                </div>
                <div className="font-medium">
                  {r.district} · {r.floor ?? "—"} · {fmtMoney(r.final_price)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.characteristics ?? r.comment ?? "Без характеристики"}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link to={`/sales/${r.id}`}><Button size="sm" variant="outline">Деталі</Button></Link>
                <Button size="sm" onClick={() => act(r.id, "approve")}>Підтвердити</Button>
                <Button size="sm" variant="outline" onClick={() => act(r.id, "duplicate")}>Дублікат</Button>
                <Button size="sm" variant="ghost" onClick={() => act(r.id, "reject")}>Відхилити</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
