import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

export interface SalesFilters {
  date_from?: string;
  date_to?: string;
  district?: string;
  property_type?: string;
  rooms?: string;
  area_min?: string;
  area_max?: string;
  price_min?: string;
  price_max?: string;
  currency?: string;
  condition?: string;
  source_type?: string;
}

export const DISTRICTS = ["Центр", "Фортечний", "Подільський", "Новомиколаївка", "Лелеківка", "Завадівка", "Балка"];
export const PROPERTY_TYPES = [
  { value: "apartment", label: "Квартира" },
  { value: "house", label: "Будинок" },
  { value: "commercial", label: "Комерція" },
  { value: "land", label: "Земля" },
];
export const CURRENCIES = ["USD", "EUR", "UAH"];
export const CONDITIONS = ["житловий стан", "після ремонту", "євроремонт", "без ремонту"];
export const SOURCE_TYPES = [
  { value: "telegram", label: "Telegram" },
  { value: "google_sheets", label: "Google Таблиці" },
  { value: "site_form", label: "Форма сайту" },
  { value: "manual", label: "Вручну" },
  { value: "csv", label: "CSV" },
];

export function FiltersBar({
  value,
  onChange,
  compact = false,
  frameless = false,
}: {
  value: SalesFilters;
  onChange: (v: SalesFilters) => void;
  compact?: boolean;
  frameless?: boolean;
}) {
  const [local, setLocal] = useState<SalesFilters>(value);
  const upd = (k: keyof SalesFilters, v: string) => setLocal((p) => ({ ...p, [k]: v || undefined }));
  const apply = () => onChange(local);
  const reset = () => { setLocal({}); onChange({}); };

  const body = (
    <>
      <div className={`grid gap-3 ${compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"}`}>
        <Field label="Дата від">
          <Input type="date" value={local.date_from ?? ""} onChange={(e) => upd("date_from", e.target.value)} />
        </Field>
        <Field label="Дата до">
          <Input type="date" value={local.date_to ?? ""} onChange={(e) => upd("date_to", e.target.value)} />
        </Field>
        <Field label="Район">
          <Select value={local.district ?? "_all"} onValueChange={(v) => upd("district", v === "_all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Усі" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Усі</SelectItem>
              {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Тип">
          <Select value={local.property_type ?? "_all"} onValueChange={(v) => upd("property_type", v === "_all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Усі" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Усі</SelectItem>
              {PROPERTY_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Кімнат">
          <Select value={local.rooms ?? "_all"} onValueChange={(v) => upd("rooms", v === "_all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Усі" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Усі</SelectItem>
              {["1","2","3","4","5"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Валюта">
          <Select value={local.currency ?? "_all"} onValueChange={(v) => upd("currency", v === "_all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Усі" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Усі</SelectItem>
              {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {!compact && (
          <>
            <Field label="Площа від"><Input type="number" value={local.area_min ?? ""} onChange={(e) => upd("area_min", e.target.value)} /></Field>
            <Field label="Площа до"><Input type="number" value={local.area_max ?? ""} onChange={(e) => upd("area_max", e.target.value)} /></Field>
            <Field label="Ціна від"><Input type="number" value={local.price_min ?? ""} onChange={(e) => upd("price_min", e.target.value)} /></Field>
            <Field label="Ціна до"><Input type="number" value={local.price_max ?? ""} onChange={(e) => upd("price_max", e.target.value)} /></Field>
            <Field label="Стан">
              <Select value={local.condition ?? "_all"} onValueChange={(v) => upd("condition", v === "_all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Усі" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Усі</SelectItem>
                  {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Джерело">
              <Select value={local.source_type ?? "_all"} onValueChange={(v) => upd("source_type", v === "_all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Усі" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Усі</SelectItem>
                  {SOURCE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <Button onClick={apply} size="sm">Застосувати</Button>
        <Button onClick={reset} size="sm" variant="ghost"><X className="h-4 w-4 mr-1" />Скинути</Button>
      </div>
    </>
  );

  if (frameless) return <div className="space-y-0">{body}</div>;

  return (
    <Card>
      <CardContent className="p-4">
        {body}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
