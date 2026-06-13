import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

export interface SalesFilters {
  district?: string;
  price_min?: string;
  price_max?: string;
}

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
        <Field label="Район/ЖК">
          <Input value={local.district ?? ""} onChange={(e) => upd("district", e.target.value)} />
        </Field>
        <Field label="Ціна від"><Input type="number" value={local.price_min ?? ""} onChange={(e) => upd("price_min", e.target.value)} /></Field>
        <Field label="Ціна до"><Input type="number" value={local.price_max ?? ""} onChange={(e) => upd("price_max", e.target.value)} /></Field>
        {!compact && (
          <>
            <div />
            <div />
            <div />
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
