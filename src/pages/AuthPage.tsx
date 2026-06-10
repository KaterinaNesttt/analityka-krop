import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate(user.status === "approved" ? "/dashboard" : "/pending", { replace: true });
    }
  }, [user, loading, navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Вхід виконано");
    } catch (err: any) {
      toast.error(err?.message ?? "Не вдалося увійти");
    } finally { setBusy(false); }
  };
  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await register(email, password, name || undefined);
      if (r.status === "approved") {
        toast.success("Акаунт створено. Увійдіть.");
        setTab("login");
      } else {
        toast.success("Заявку відправлено. Очікуйте підтвердження.");
        setTab("login");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Помилка реєстрації");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-accent/30">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Аналітика Кроп</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Закрита платформа аналітики фактичних продажів нерухомості
          </p>
        </div>
        <Card>
          <CardHeader>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">Вхід</TabsTrigger>
                <TabsTrigger value="register" className="flex-1">Реєстрація</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {tab === "login" ? (
              <form onSubmit={onLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "..." : "Увійти"}
                </Button>
              </form>
            ) : (
              <form onSubmit={onRegister} className="space-y-4">
                <div>
                  <Label htmlFor="rname">Імʼя (необовʼязково)</Label>
                  <Input id="rname" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="remail">Email</Label>
                  <Input id="remail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="rpassword">Пароль (мін. 8)</Label>
                  <Input id="rpassword" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Після реєстрації акаунт очікує підтвердження адміністратором.
                </p>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "..." : "Зареєструватись"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">На головну</Link>
        </p>
      </div>
    </div>
  );
}
