import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, roleLabel, statusLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  const q = useQuery({ queryKey: ["users"], queryFn: () => api<{ users: any[] }>("/api/users") });

  const approve = async (id: string) => { try { await api(`/api/users/${id}/approve`, { method: "PATCH" }); toast.success("Підтверджено"); q.refetch(); } catch (e: any) { toast.error(e.message); } };
  const block = async (id: string, unblock = false) => { try { await api(`/api/users/${id}/block`, { method: "PATCH", body: { unblock } }); toast.success("Готово"); q.refetch(); } catch (e: any) { toast.error(e.message); } };
  const setRole = async (id: string, role: string) => { try { await api(`/api/users/${id}/role`, { method: "PATCH", body: { role } }); toast.success("Роль оновлено"); q.refetch(); } catch (e: any) { toast.error(e.message); } };

  return (
    <PageShell>
      <PageHeader title="Користувачі" description="Тільки для адміністраторів." />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Імʼя</th>
                <th className="p-3 text-left">Роль</th>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">Реєстрація</th>
                <th className="p-3 text-left">Останній вхід</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {q.data?.users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 text-muted-foreground">{u.name ?? "—"}</td>
                  <td className="p-3">
                    <Select value={u.role} onValueChange={(v) => setRole(u.id, v)}>
                      <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">{roleLabel("user")}</SelectItem>
                        <SelectItem value="moderator">{roleLabel("moderator")}</SelectItem>
                        <SelectItem value="admin">{roleLabel("admin")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3"><Badge variant={u.status === "approved" ? "default" : u.status === "blocked" ? "destructive" : "secondary"}>{statusLabel(u.status)}</Badge></td>
                  <td className="p-3 text-muted-foreground text-xs">{fmtDate(u.created_at)}</td>
                  <td className="p-3 text-muted-foreground text-xs">{fmtDate(u.last_login_at)}</td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    {u.status === "pending" && <Button size="sm" onClick={() => approve(u.id)}>Підтвердити</Button>}
                    {u.status !== "blocked" ? (
                      <Button size="sm" variant="outline" onClick={() => block(u.id)}>Блокувати</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => block(u.id, true)}>Розблокувати</Button>
                    )}
                  </td>
                </tr>
              ))}
              {!q.isLoading && (q.data?.users.length ?? 0) === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Немає користувачів</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
