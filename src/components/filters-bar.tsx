import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";

export interface SalesFilters {
  district?: string;
  districts?: string[];
  price_min?: string;
  price_max?: string;
  floor?: string;
  rooms?: string;
  property_type?: string;
  sale_term?: string;
  condition?: string;
  furniture?: string;
}

export function FiltersBar({
  value,
  onChange,
  districtOptions = [],
  compact = false,
  frameless = false,
}: {
  value: SalesFilters;
  onChange: (v: SalesFilters) => void;
  districtOptions?: string[];
  compact?: boolean;
  frameless?: boolean;
}) {
  const [local, setLocal] = useState<SalesFilters>(value);
  const upd = (k: Exclude<keyof SalesFilters, "districts">, v: string) => setLocal((p) => ({ ...p, [k]: v || undefined }));
  const selectedDistricts = local.districts ?? [];
  const toggleDistrict = (district: string, checked: boolean) => {
    setLocal((p) => {
      const current = p.districts ?? [];
      const next = checked ? [...current, district] : current.filter((item) => item !== district);
      return { ...p, district: undefined, districts: next.length ? next : undefined };
    });
  };
  const apply = () => onChange(local);
  const reset = () => { setLocal({}); onChange({}); };

  const body = (
    <>
      <div className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"}`}>
        <Field label="Район/ЖК">
          {districtOptions.length ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between overflow-hidden font-normal">
                  <span className="truncate">
                    {selectedDistricts.length ? `${selectedDistricts.length} обрано` : "Оберіть райони"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="max-h-72 w-72 overflow-y-auto p-2">
                <div className="space-y-1">
                  {districtOptions.map((district) => (
                    <label key={district} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                      <Checkbox
                        checked={selectedDistricts.includes(district)}
                        onCheckedChange={(checked) => toggleDistrict(district, checked === true)}
                      />
                      <span className="truncate">{district}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Input value={local.district ?? ""} onChange={(e) => upd("district", e.target.value)} />
          )}
        </Field>
        <Field label="Ціна від"><Input type="number" value={local.price_min ?? ""} onChange={(e) => upd("price_min", e.target.value)} /></Field>
        <Field label="Ціна до"><Input type="number" value={local.price_max ?? ""} onChange={(e) => upd("price_max", e.target.value)} /></Field>
        <Field label="Поверх"><Input value={local.floor ?? ""} onChange={(e) => upd("floor", e.target.value)} /></Field>
        <Field label="Кімнати"><Input value={local.rooms ?? ""} onChange={(e) => upd("rooms", e.target.value)} /></Field>
        <Field label="Тип"><Input value={local.property_type ?? ""} onChange={(e) => upd("property_type", e.target.value)} /></Field>
        <Field label="Термін"><Input value={local.sale_term ?? ""} onChange={(e) => upd("sale_term", e.target.value)} /></Field>
        <Field label="Стан"><Input value={local.condition ?? ""} onChange={(e) => upd("condition", e.target.value)} /></Field>
        <Field label="Меблі"><Input value={local.furniture ?? ""} onChange={(e) => upd("furniture", e.target.value)} /></Field>
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
