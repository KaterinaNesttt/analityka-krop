import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICTS, PROPERTY_TYPES, CURRENCIES, CONDITIONS, SOURCE_TYPES } from "@/components/filters-bar";
import { toast } from "sonner";

export function NewSalePage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({
    property_type: "apartment",
    currency: "USD",
    source_type: "site_form",
    sale_date: new Date().toISOString().slice(0, 10),
  });
  const u = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: any = { ...f };
      ["rooms", "total_area", "floor", "floors_total", "initial_price", "final_price"].forEach((k) => {
        if (payload[k] === "" || payload[k] == null) delete payload[k]; else payload[k] = Number(payload[k]);
      });
      await api("/api/sales", { method: "POST", body: payload });
      toast.success("Дані відправлено на перевірку");
      navigate("/sales");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  return (
    <PageShell>
      <PageHeader title="Додати продаж" description="Запис буде відправлено на перевірку модератором." />
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Обовʼязкові поля</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldSelect label="Тип нерухомості *" value={f.property_type} onValueChange={(v) => u("property_type", v)} options={PROPERTY_TYPES.map((p) => ({ value: p.value, label: p.label }))} />
            <FieldSelect label="Район *" value={f.district ?? ""} onValueChange={(v) => u("district", v)} options={DISTRICTS.map((d) => ({ value: d, label: d }))} placeholder="Оберіть" />
            <FieldSelect label="Кімнат" value={String(f.rooms ?? "")} onValueChange={(v) => u("rooms", v ? Number(v) : null)} options={["1","2","3","4","5"].map((r) => ({ value: r, label: r }))} placeholder="—" />
            <FieldNum label="Загальна площа, м² *" value={f.total_area} onChange={(v) => u("total_area", v)} required />
            <FieldNum label="Фінальна ціна *" value={f.final_price} onChange={(v) => u("final_price", v)} required />
            <FieldSelect label="Валюта *" value={f.currency} onValueChange={(v) => u("currency", v)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            <Field label="Дата продажу *"><Input type="date" required value={f.sale_date ?? ""} onChange={(e) => u("sale_date", e.target.value)} /></Field>
            <FieldSelect label="Джерело *" value={f.source_type} onValueChange={(v) => u("source_type", v)} options={SOURCE_TYPES.map((s) => ({ value: s.value, label: s.label }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Додаткові поля</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldNum label="Поверх" value={f.floor} onChange={(v) => u("floor", v)} />
            <FieldNum label="Поверховість" value={f.floors_total} onChange={(v) => u("floors_total", v)} />
            <Field label="Земля"><Input value={f.land_area ?? ""} onChange={(e) => u("land_area", e.target.value)} /></Field>
            <Field label="Комунікації"><Input value={f.communications ?? ""} onChange={(e) => u("communications", e.target.value)} /></Field>
            <Field label="Зручності"><Input value={f.amenities ?? ""} onChange={(e) => u("amenities", e.target.value)} /></Field>
            <FieldSelect label="Стан ремонту" value={f.condition ?? ""} onValueChange={(v) => u("condition", v)} options={CONDITIONS.map((c) => ({ value: c, label: c }))} placeholder="—" />
            <Field label="Тип"><Input value={f.building_type ?? ""} onChange={(e) => u("building_type", e.target.value)} /></Field>
            <Field label="Меблі/техніка"><Input value={f.furniture ?? ""} onChange={(e) => u("furniture", e.target.value)} /></Field>
            <Field label="Термін"><Input value={f.sale_term ?? ""} onChange={(e) => u("sale_term", e.target.value)} /></Field>
            <FieldNum label="Початкова ціна" value={f.initial_price} onChange={(v) => u("initial_price", v)} />
            <Field label="Короткий коментар" className="md:col-span-3">
              <Textarea value={f.comment ?? ""} onChange={(e) => u("comment", e.target.value)} rows={3} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/sales")}>Скасувати</Button>
          <Button type="submit" disabled={busy}>{busy ? "..." : "Відправити на перевірку"}</Button>
        </div>
      </form>
    </PageShell>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function FieldNum({ label, value, onChange, required }: { label: string; value: any; onChange: (v: string) => void; required?: boolean }) {
  return <Field label={label}><Input type="number" step="any" required={required} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Field>;
}
function FieldSelect({ label, value, onValueChange, options, placeholder }: { label: string; value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Field label={label}>
      <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger><SelectValue placeholder={placeholder ?? "—"} /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  );
}
