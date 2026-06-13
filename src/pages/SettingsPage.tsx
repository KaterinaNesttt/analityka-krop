import { PageHeader, PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { statusLabel } from "@/lib/format";
import { Moon, Sun } from "lucide-react";

export function SettingsPage() {
  const { theme, set } = useTheme();
  const { user } = useAuth();

  return (
    <PageShell>
      <PageHeader title="Налаштування" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Тема</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => set("light")}
            >
              <Sun className="h-4 w-4 mr-2" />
              Світла
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => set("dark")}>
              <Moon className="h-4 w-4 mr-2" />
              Темна
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Профіль</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Email: </span>
              {user?.email}
            </div>
            <div>
              <span className="text-muted-foreground">Статус: </span>
              {statusLabel(user?.status ?? "")}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Ваше імʼя та email не показуються іншим користувачам платформи.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
