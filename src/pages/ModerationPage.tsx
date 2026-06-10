import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney, fmtArea, propertyTypeLabel, sourceLabel, statusLabel } from "@/lib/format";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function ModerationPage() {
  const [source, setSource] = useState<string>("_all");
  const q = useQuery({
    queryKey: ["mod-list", source],
    queryFn: () => api<{ sales: any[] }>("/api/sales", { query: { status: "pending", source_type: source === "_all" ? undefined : source } }),
  });

  const act = async (id: string, action: "approve" | "reject" | "duplicate") => {
    try {
      await api(`/api/sales/${id}/${action}`, { method: "PATCH" });
      toast.success("Готово"); q.refetch();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PageShell>
      <PageHeader title="Модерація" description="Записи на перевірці.">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Усі джерела</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="google_sheets">Google Таблиці</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="site_form">Форма сайту</SelectItem>
            <SelectItem value="manual">Вручну</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

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
                  <Badge variant="secondary">{sourceLabel(r.source_type)}</Badge>
                  <Badge variant="outline">{statusLabel(r.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                </div>
                <div className="font-medium">
                  {propertyTypeLabel(r.property_type)} · {r.district} · {r.rooms ?? "?"}-к · {fmtArea(r.total_area)} · {fmtMoney(r.final_price, r.currency)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.address_hint ?? "Без адреси"} · продано {fmtDate(r.sale_date)}
                </div>
                {r.source_text && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Сирий текст</summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap">{r.source_text}</pre>
                  </details>
                )}
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
