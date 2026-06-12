import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { FiltersBar, type SalesFilters } from "@/components/filters-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtArea, propertyTypeLabel, statusLabel } from "@/lib/format";
import { ExternalLink, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";

export function SalesListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === "superuser" || user?.role === "admin" || user?.role === "moderator";
  const [filters, setFilters] = useState<SalesFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("sale_date_desc");


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
                <th className="text-left p-3">Дата</th>
                <th className="text-left p-3">Тип</th>
                <th className="text-left p-3">Район</th>
                <th className="text-left p-3">Кімн.</th>
                <th className="text-left p-3">Площа</th>
                <th className="text-left p-3">Поверх</th>
                <th className="text-right p-3">Ціна</th>
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
                <tr onClick={() => navigate(`/sales/${r.id}`)} key={r.id} className="border-t cursor-pointer hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap">{fmtMonthYear(r.sale_date)}</td>
                  <td className="p-3">{r.building_type ?? propertyTypeLabel(r.property_type)}</td>
                  <td className="p-3">{r.district}</td>
                  <td className="p-3">{r.rooms ?? "—"}</td>
                  <td className="p-3">{fmtArea(r.total_area)}</td>
                   <td className="p-3">{r.floor ? `${r.floor}/${r.floors_total ?? "?"}` : "—"}</td>
                  <td className="p-3 text-right font-medium">{fmtMoney(r.final_price, r.currency)}</td>
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

function fmtMonthYear(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(date);
}
