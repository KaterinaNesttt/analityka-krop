import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { roleLabel } from "@/lib/format";
import { Moon, Sun, Trash2 } from "lucide-react";

export function SettingsPage() {
  const { theme, set } = useTheme();
  const { user } = useAuth();

  const deleteDemo = async () => {
    if (!confirm("Видалити всі демо-записи?")) return;
    try {
      const r = await api<{ deleted: number }>("/api/sales/demo", { method: "DELETE" });
      toast.success(`Видалено ${r.deleted} демо-записів`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <PageShell>
      <PageHeader title="Налаштування" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Тема</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => set("light")}><Sun className="h-4 w-4 mr-2" />Світла</Button>
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => set("dark")}><Moon className="h-4 w-4 mr-2" />Темна</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Профіль</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Email: </span>{user?.email}</div>
            <div><span className="text-muted-foreground">Роль: </span>{roleLabel(user?.role ?? "")}</div>
            <div><span className="text-muted-foreground">Статус: </span>{user?.status}</div>
            <p className="text-xs text-muted-foreground pt-2">Ваше імʼя та email не показуються іншим користувачам платформи.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">API</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Endpoint: </span><code className="text-xs">{API_BASE || "(відносний шлях)"}</code></div>
            <p className="text-xs text-muted-foreground pt-1">
              Налаштовується через змінну середовища <code>VITE_API_URL</code> при білді фронтенду.
            </p>
          </CardContent>
        </Card>

        {(user?.role === "superuser" || user?.role === "admin") && (
          <Card>
            <CardHeader><CardTitle className="text-base text-destructive">Службові дії</CardTitle></CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={deleteDemo}>
                <Trash2 className="h-4 w-4 mr-2" />Очистити демо-дані
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Видаляє всі записи з позначкою <code>is_demo = 1</code>.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
