import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { FiltersBar, type SalesFilters } from "@/components/filters-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { SlidersHorizontal } from "lucide-react";

export function SalesListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SalesFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("created_at_desc");


  const { data, isLoading } = useQuery({
    queryKey: ["sales", filters, sort],
    queryFn: () => api<{ sales: any[] }>("/api/sales", { query: { ...filters, sort } }),
  });

  const { data: districtData } = useQuery({
    queryKey: ["sales-district-options"],
    queryFn: () => api<{ sales: any[] }>("/api/sales", { query: { sort: "district", limit: 1000 } }),
  });

  const rows = data?.sales ?? [];
  const districtOptions = useMemo(() => {
    const districts = (districtData?.sales ?? [])
      .map((sale) => String(sale.district ?? "").trim())
      .filter(Boolean);
    return Array.from(new Set(districts)).sort((a, b) => a.localeCompare(b, "uk"));
  }, [districtData]);

  return (
    <PageShell>
      <PageHeader title="Продажі">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
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
        <div className="mb-4 rounded-md border border-border/60 bg-muted p-4">
          <FiltersBar value={filters} onChange={setFilters} districtOptions={districtOptions} frameless />
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-md bg-secondary/70 border md:block">
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
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Завантаження…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Немає даних</td></tr>
              )}
              {rows.map((r) => (
                <tr onClick={() => navigate(`/sales/${r.id}`)} key={r.id} className="border-t cursor-pointer hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.district}</td>
                  <td className="p-3 whitespace-nowrap">{r.floor ?? "—"}</td>
                  <td className="p-3 max-w-xs truncate">{saleCharacteristics(r)}</td>
                  <td className="p-3 whitespace-nowrap">{r.sale_term ?? "—"}</td>
                  <td className="p-3 text-right">{fmtMoney(r.initial_price)}</td>
                  <td className="p-3 text-right font-medium">{fmtMoney(r.final_price)}</td>
                  <td className="p-3 max-w-xs truncate">{r.comment ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading && (
          <div className="rounded-md border bg-secondary/70 p-6 text-center text-sm text-muted-foreground">Завантаження…</div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-md border bg-secondary/70 p-6 text-center text-sm text-muted-foreground">Немає даних</div>
        )}
        {rows.map((r) => (
          <button
            type="button"
            onClick={() => navigate(`/sales/${r.id}`)}
            key={r.id}
            className="w-full rounded-md border bg-secondary/70 p-4 text-left text-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="font-medium">{r.district}</div>
              <div className="whitespace-nowrap font-medium">{fmtMoney(r.final_price)}</div>
            </div>
            <div className="space-y-1 text-muted-foreground">
              <div>Поверх: {r.floor ?? "—"}</div>
              <div>Характеристика: {saleCharacteristics(r)}</div>
              <div>Термін продажу: {r.sale_term ?? "—"}</div>
              <div>Старт ціна: {fmtMoney(r.initial_price)}</div>
              <div>Коментар: {r.comment ?? "—"}</div>
            </div>
          </button>
        ))}
      </div>
    </PageShell>
  );
}

function saleCharacteristics(row: any): string {
  const parts = [
    row.characteristics,
    row.total_area,
    row.land_area,
    row.communications,
    row.amenities,
    row.condition,
    row.furniture,
  ]
    .map((value) => value === undefined || value === null ? "" : String(value).trim())
    .filter(Boolean);
  return parts.length ? parts.join("; ") : "—";
}
