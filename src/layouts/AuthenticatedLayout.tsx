import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard, BarChart3, Table2, Plus, Upload, ShieldCheck, Users, Settings, Moon, Sun, LogOut, Building2, Menu,
} from "lucide-react";
import { roleLabel } from "@/lib/format";

interface NavItem { to: string; label: string; icon: any; roles?: string[]; }

const STAFF_ROLES = ["superuser", "admin", "moderator"];

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Дашборд", icon: LayoutDashboard, roles: STAFF_ROLES },
  { to: "/analytics", label: "Аналітика", icon: BarChart3 },
  { to: "/sales", label: "Продажі", icon: Table2 },
  { to: "/sales/new", label: "Додати продаж", icon: Plus },
  { to: "/import", label: "Імпорт", icon: Upload, roles: STAFF_ROLES },
  { to: "/moderation", label: "Модерація", icon: ShieldCheck, roles: ["admin", "moderator"] },
  { to: "/users", label: "Користувачі", icon: Users, roles: ["admin"] },
  { to: "/settings", label: "Налаштування", icon: Settings },
];

export function AuthenticatedLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (user.status !== "approved") navigate("/pending", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading || !user || user.status !== "approved") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Завантаження…</div>;
  }

  const visibleNav = NAV.filter((n) => !n.roles || user.role === "superuser" || n.roles.includes(user.role));

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 h-16 flex items-center gap-2 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold leading-tight">Аналітика Кроп</div>
          <div className="text-[11px] text-muted-foreground">Кропивницький</div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-1">
          {visibleNav.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-2 text-xs text-muted-foreground">
          <div className="truncate">{user.name ?? user.email}</div>
          <div>{roleLabel(user.role)}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={async () => { await logout(); navigate("/auth"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:block w-64 shrink-0">{sidebar}</aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 border-b flex items-center justify-between px-4 sticky top-0 z-30 bg-background/95 backdrop-blur">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-accent">
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-semibold">Аналітика Кроп</div>
          <button onClick={toggle} className="p-2 -mr-2 rounded-md hover:bg-accent">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
