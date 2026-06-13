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
      <PageHeader title="Продажі" />

      <div className="mb-4 hidden items-center justify-between gap-3 rounded-md border border-white/10 bg-black/35 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-md md:flex">
        <div>
          <div className="text-sm font-medium text-foreground">База продажів</div>
          <div className="text-xs text-muted-foreground">{isLoading ? "Завантаження…" : `${rows.length} записів`}</div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44 border-white/10 bg-black/30"><SelectValue /></SelectTrigger>
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
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 md:hidden">
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
      </div>

      {filtersOpen && (
        <div className="mb-4 rounded-md border border-white/10 bg-black/40 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-md md:p-5">
          <FiltersBar value={filters} onChange={setFilters} districtOptions={districtOptions} frameless />
        </div>
      )}

      <div className="hidden overflow-hidden rounded-md border border-white/10 bg-black/45 shadow-[0_22px_60px_rgba(0,0,0,0.32)] backdrop-blur-md md:block">
        <div className="max-h-[calc(100vh-13rem)] overflow-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[8%]" />
              <col className="w-[26%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-black/70 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur-md">
              <tr>
                <th className="px-4 py-3 text-left">Район/ЖК</th>
                <th className="px-4 py-3 text-left">Поверх</th>
                <th className="px-4 py-3 text-left">Характеристика</th>
                <th className="px-4 py-3 text-left">Термін продажу</th>
                <th className="px-4 py-3 text-right">Старт ціна</th>
                <th className="px-4 py-3 text-right">Продаж ціна</th>
                <th className="px-4 py-3 text-left">Коментар</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {isLoading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Завантаження…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Немає даних</td></tr>
              )}
              {rows.map((r) => (
                <tr onClick={() => navigate(`/sales/${r.id}`)} key={r.id} className="cursor-pointer odd:bg-white/2.5 transition-colors hover:bg-primary/10">
                  <td className="px-4 py-4 align-top font-semibold text-foreground">{r.district}</td>
                  <td className="px-4 py-4 align-top whitespace-nowrap text-muted-foreground">{r.floor ?? "—"}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="line-clamp-2 leading-5 text-foreground/90">{saleCharacteristics(r)}</div>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap text-muted-foreground">{r.sale_term ?? "—"}</td>
                  <td className="px-4 py-4 align-top text-right tabular-nums text-muted-foreground">{fmtMoney(r.initial_price)}</td>
                  <td className="px-4 py-4 align-top text-right font-semibold tabular-nums text-foreground">{fmtMoney(r.final_price)}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="truncate text-muted-foreground">{r.comment ?? "—"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const value = row.characteristics === undefined || row.characteristics === null ? "" : String(row.characteristics).trim();
  return value || "—";
}
