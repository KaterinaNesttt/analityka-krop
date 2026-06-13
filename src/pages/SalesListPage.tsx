import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { FiltersBar, type SalesFilters } from "@/components/filters-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, statusLabel } from "@/lib/format";
import { ExternalLink, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function SalesListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === "superuser" || user?.role === "admin" || user?.role === "moderator";
  const [filters, setFilters] = useState<SalesFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("created_at_desc");


  const { data, isLoading } = useQuery({
    queryKey: ["sales", filters, sort],
    queryFn: () => api<{ sales: any[] }>("/api/sales", { query: { ...filters, sort } }),
  });

  const rows = data?.sales ?? [];

  return (
    <PageShell>
      <PageHeader title="Продажі">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at_desc">Новіші</SelectItem>
            <SelectItem value="created_at_asc">Старіші</SelectItem>
            <SelectItem value="price_desc">Ціна ↓</SelectItem>
            <SelectItem value="price_asc">Ціна ↑</SelectItem>
            <SelectItem value="district">За Район/ЖК</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={filtersOpen ? "default" : "outline"} size="sm" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Фільтр
        </Button>

      </PageHeader>

      {filtersOpen && (
        <div className="mb-4 rounded-md border border-border/60 bg-muted/20 p-4">
          <FiltersBar value={filters} onChange={setFilters} frameless />
        </div>
      )}

      <div className="overflow-x-auto rounded-md bg-secondary/70 border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left p-3">Район/ЖК</th>
                <th className="text-left p-3">Поверх</th>
                <th className="text-left p-3">Характеристика</th>
                <th className="text-left p-3">Термін продажу</th>
                <th className="text-right p-3">Старт ціна</th>
                <th className="text-right p-3">Продаж ціна</th>
                <th className="text-left p-3">Коментар</th>
                {isStaff && <th className="text-left p-3">Статус</th>}
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={isStaff ? 9 : 8} className="p-8 text-center text-muted-foreground">Завантаження…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={isStaff ? 9 : 8} className="p-8 text-center text-muted-foreground">Немає даних</td></tr>
              )}
              {rows.map((r) => (
                <tr onClick={() => navigate(`/sales/${r.id}`)} key={r.id} className="border-t cursor-pointer hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.district}</td>
                  <td className="p-3 whitespace-nowrap">{r.floor ?? "—"}</td>
                  <td className="p-3 max-w-xs truncate">{r.characteristics ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">{r.sale_term ?? "—"}</td>
                  <td className="p-3 text-right">{fmtMoney(r.initial_price)}</td>
                  <td className="p-3 text-right font-medium">{fmtMoney(r.final_price)}</td>
                  <td className="p-3 max-w-xs truncate">{r.comment ?? "—"}</td>
                  {isStaff && <td className="p-3"><Badge variant={r.status === "approved" ? "default" : "secondary"}>{statusLabel(r.status)}</Badge></td>}
                  <td className="p-3 text-right">
                    <button className="text-primary  inline-flex items-center gap-1">
                      Деталі <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </PageShell>
  );
}
