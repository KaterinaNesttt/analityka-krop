import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function NewSalePage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({});
  const u = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: any = { ...f };
      ["initial_price", "final_price"].forEach((k) => {
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
      <PageHeader title="Додати продаж" />
      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Поля продажу</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Район/ЖК *"><Input required value={f.district ?? ""} onChange={(e) => u("district", e.target.value)} /></Field>
            <Field label="Поверх"><Input value={f.floor ?? ""} onChange={(e) => u("floor", e.target.value)} /></Field>
            <Field label="Термін продажу"><Input value={f.sale_term ?? ""} onChange={(e) => u("sale_term", e.target.value)} /></Field>
            <FieldNum label="Початкова ціна" value={f.initial_price} onChange={(v) => u("initial_price", v)} />
            <FieldNum label="Продаж ціна" value={f.final_price} onChange={(v) => u("final_price", v)} />
            <Field label="Характеристика" className="md:col-span-3">
              <Textarea value={f.characteristics ?? ""} onChange={(e) => u("characteristics", e.target.value)} rows={3} />
            </Field>
            <Field label="Коментар" className="md:col-span-3">
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
