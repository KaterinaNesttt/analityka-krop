import { useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

const FIELDS = [
  ["district", "Район *"],
  ["characteristics", "Характеристика"],
  ["floor", "Поверх"],
  ["sale_term", "Термін продажу"],
  ["initial_price", "Початкова ціна"],
  ["final_price", "Продаж ціна"],
  ["comment", "Коментар"],
] as const;

const HEADER_MAP: Record<string, string> = {
  "район/жк": "district",
  "поверх": "floor",
  "характеристика": "characteristics",
  "термін продажу": "sale_term",
  "термiн продажу": "sale_term",
  "старт ціна": "initial_price",
  "старт цiна": "initial_price",
  "продаж ціна": "final_price",
  "продаж цiна": "final_price",
  "коментар": "comment",
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function ImportPage() {
  return (
    <PageShell>
      <PageHeader title="Імпорт" />
      <Tabs defaultValue="telegram">
        <TabsList>
          <TabsTrigger value="telegram">Telegram-текст</TabsTrigger>
          <TabsTrigger value="csv">CSV</TabsTrigger>
        </TabsList>
        <TabsContent value="telegram" className="mt-4"><TelegramImport /></TabsContent>
        <TabsContent value="csv" className="mt-4"><CsvImport /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

function TelegramImport() {
  const { user } = useAuth();
  const isStaff = user?.role === "superuser" || user?.role === "admin" || user?.role === "moderator";
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"pending" | "approved">("pending");

  const parse = async () => {
    try {
      setBusy(true);
      const r = await api<{ parsed: any }>("/api/import/telegram-text", { method: "POST", body: { text } });
      setParsed(r.parsed);
      toast.success("Розпізнано. Перевірте та виправте поля.");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const save = async () => {
    try {
      setBusy(true);
      const payload = { ...parsed, status: isStaff ? status : undefined };
      await api("/api/sales", { method: "POST", body: payload });
      toast.success("Збережено");
      setText(""); setParsed(null);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Текст з Telegram</CardTitle>
          <CardDescription>Вставте повідомлення і натисніть «Розпізнати».</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Напр.: 2-к, Центр, вул. Шевченка, 54 м², 3/5, цегла, євроремонт, $42000, 12.05.2026" />
          <Button onClick={parse} disabled={!text.trim() || busy}>Розпізнати</Button>
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardHeader><CardTitle className="text-base">Уточніть поля</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ParsedForm value={parsed} onChange={setParsed} />
            {isStaff && (
              <div>
                <Label className="text-xs text-muted-foreground">Статус при збереженні</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">На перевірці</SelectItem>
                    <SelectItem value="approved">Підтверджено</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={save} disabled={busy}>Зберегти</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ParsedForm({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const u = (k: string, v: any) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <Field label="Район/ЖК"><Input value={value.district ?? ""} onChange={(e) => u("district", e.target.value)} /></Field>
      <Field label="Поверх"><Input value={value.floor ?? ""} onChange={(e) => u("floor", e.target.value)} /></Field>
      <Field label="Термін продажу"><Input value={value.sale_term ?? ""} onChange={(e) => u("sale_term", e.target.value)} /></Field>
      <Field label="Старт ціна"><Input type="number" value={value.initial_price ?? ""} onChange={(e) => u("initial_price", Number(e.target.value) || null)} /></Field>
      <Field label="Продаж ціна"><Input type="number" value={value.final_price ?? ""} onChange={(e) => u("final_price", Number(e.target.value) || null)} /></Field>
      <Field label="Характеристика"><Input value={value.characteristics ?? ""} onChange={(e) => u("characteristics", e.target.value)} /></Field>
      <Field label="Коментар"><Input value={value.comment ?? ""} onChange={(e) => u("comment", e.target.value)} /></Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = []; let buf = ""; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { buf += '"'; i++; } else { inQuotes = false; }
      } else buf += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(buf); buf = ""; }
      else if (c === '\n' || c === '\r') {
        if (buf !== "" || cur.length) { cur.push(buf); rows.push(cur); cur = []; buf = ""; }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else buf += c;
    }
  }
  if (buf !== "" || cur.length) { cur.push(buf); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function CsvImport() {
  const { user } = useAuth();
  const isStaff = user?.role === "superuser" || user?.role === "admin" || user?.role === "moderator";
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"pending" | "approved">("pending");
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File) => {
    setFileName(f.name);
    const text = await f.text();
    const rows = parseCsv(text);
    if (!rows.length) { toast.error("Порожній файл"); return; }
    setHeaders(rows[0]); setCsvRows(rows.slice(1));
    const m: Record<string, string> = {};
    rows[0].forEach((h, idx) => {
      const key = normalizeHeader(h);
      const field = key ? HEADER_MAP[key] : undefined;
      if (field && m[field] === undefined) m[field] = String(idx);
    });
    setMapping(m);
  };

  const doImport = async () => {
    try {
      setBusy(true);
      const items = csvRows.map((r) => {
        const o: any = {};
        for (const [field] of FIELDS) {
          const idx = mapping[field];
          if (idx !== undefined && idx !== "") o[field] = r[Number(idx)]?.trim() || null;
        }
        return o;
      });
      const r = await api<{ total: number; created: number; duplicates: number; errors: number }>(
        "/api/import/csv",
        {
          method: "POST",
          body: {
            rows: items,
            file_name: fileName,
            status: isStaff ? status : undefined,
          },
        },
      );
      toast.success(`Створено: ${r.created}, дублікатів: ${r.duplicates}, помилок: ${r.errors}`);
      setCsvRows([]); setHeaders([]); setMapping({});
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">CSV з Google Таблиць</CardTitle><CardDescription>Файл → Завантажити → Значення, розділені комами (.csv)</CardDescription></CardHeader>
        <CardContent>
          <Input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Мапінг колонок</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FIELDS.map(([field, label]) => (
                <Field key={field} label={label}>
                  <Select value={mapping[field] ?? "_none"} onValueChange={(v) => setMapping((p) => ({ ...p, [field]: v === "_none" ? "" : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— не зіставлено —</SelectItem>
                      {headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Колонка ${i + 1}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Попередній перегляд (перші 10 рядків)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>{headers.map((h, i) => <th key={i} className="text-left p-2">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            {isStaff && (
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">На перевірці</SelectItem>
                  <SelectItem value="approved">Підтверджено</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button onClick={doImport} disabled={busy}>Імпортувати {csvRows.length} рядків</Button>
          </div>
        </>
      )}
    </div>
  );
}
