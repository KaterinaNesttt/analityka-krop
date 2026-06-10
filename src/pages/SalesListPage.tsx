import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { FiltersBar, type SalesFilters } from "@/components/filters-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney, fmtArea, propertyTypeLabel, statusLabel } from "@/lib/format";
import { ExternalLink, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function SalesListPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "superuser" || user?.role === "admin" || user?.role === "moderator";
  const [filters, setFilters] = useState<SalesFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("sale_date_desc");
  const [mode, setMode] = useState<"compact" | "detailed">("compact");

  const { data, isLoading } = useQuery({
    queryKey: ["sales", filters, sort],
    queryFn: () => api<{ sales: any[] }>("/api/sales", { query: { ...filters, sort } }),
  });

  const rows = data?.sales ?? [];

  return (
    <PageShell>
      <PageHeader title="Продажі" description={isStaff ? "Усі записи (включно з pending)" : "Підтверджені продажі"}>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sale_date_desc">Дата ↓</SelectItem>
            <SelectItem value="sale_date_asc">Дата ↑</SelectItem>
            <SelectItem value="price_desc">Ціна ↓</SelectItem>
            <SelectItem value="price_asc">Ціна ↑</SelectItem>
            <SelectItem value="area_desc">Площа ↓</SelectItem>
            <SelectItem value="district">За районом</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={filtersOpen ? "default" : "outline"} size="sm" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Фільтр
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMode(mode === "compact" ? "detailed" : "compact")}>
          {mode === "compact" ? <LayoutGrid className="h-4 w-4 mr-1" /> : <List className="h-4 w-4 mr-1" />}
          {mode === "compact" ? "Детально" : "Компактно"}
        </Button>
      </PageHeader>

      {filtersOpen && (
        <div className="mb-4 rounded-md border border-border/60 bg-muted/20 p-4">
          <FiltersBar value={filters} onChange={setFilters} frameless />
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left p-3">Дата</th>
                <th className="text-left p-3">Тип</th>
                <th className="text-left p-3">Район</th>
                <th className="text-left p-3">Кімн.</th>
                <th className="text-left p-3">Площа</th>
                {mode === "detailed" && <th className="text-left p-3">Поверх</th>}
                <th className="text-right p-3">Ціна</th>
                <th className="text-right p-3">$/м²</th>
                {isStaff && <th className="text-left p-3">Статус</th>}
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Завантаження…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Немає даних</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.sale_date)}</td>
                  <td className="p-3">{r.building_type ?? propertyTypeLabel(r.property_type)}</td>
                  <td className="p-3">{r.district}</td>
                  <td className="p-3">{r.rooms ?? "—"}</td>
                  <td className="p-3">{fmtArea(r.total_area)}</td>
                  {mode === "detailed" && <td className="p-3">{r.floor ? `${r.floor}/${r.floors_total ?? "?"}` : "—"}</td>}
                  <td className="p-3 text-right font-medium">{fmtMoney(r.final_price, r.currency)}</td>
                  <td className="p-3 text-right">{r.total_area ? fmtMoney(r.final_price / r.total_area, r.currency) : "—"}</td>
                  {isStaff && <td className="p-3"><Badge variant={r.status === "approved" ? "default" : "secondary"}>{statusLabel(r.status)}</Badge></td>}
                  <td className="p-3 text-right">
                    <Link to={`/sales/${r.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                      Деталі <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
