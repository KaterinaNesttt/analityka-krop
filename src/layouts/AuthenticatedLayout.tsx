import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import dashboardIcon from "@/assets/icons/dashboard.svg";
import analyticsIcon from "@/assets/icons/analytics.svg";
import salesIcon from "@/assets/icons/sales.svg";
import addSaleIcon from "@/assets/icons/add-sale.svg";
import importIcon from "@/assets/icons/import.svg";
import moderationIcon from "@/assets/icons/moderation.svg";
import usersIcon from "@/assets/icons/users.svg";
import settingsIcon from "@/assets/icons/settings.svg";
import { AppSidebar } from "@/components/app-sidebar";
import { BackgroundLayer } from "@/components/background-layer";
import { MobileBottomBar } from "@/components/mobile-bottom-bar";

interface NavItem { to: string; label: string; icon: string; roles?: string[]; }

const STAFF_ROLES = ["superuser", "admin", "moderator"];

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Дашборд", icon: dashboardIcon, roles: STAFF_ROLES },
  { to: "/analytics", label: "Аналітика", icon: analyticsIcon },
  { to: "/sales", label: "Продажі", icon: salesIcon },
  { to: "/sales/new", label: "Додати продаж", icon: addSaleIcon },
  { to: "/import", label: "Імпорт", icon: importIcon, roles: STAFF_ROLES },
  { to: "/moderation", label: "Модерація", icon: moderationIcon, roles: ["admin", "moderator"] },
  { to: "/users", label: "Користувачі", icon: usersIcon, roles: ["admin"] },
  { to: "/settings", label: "Налаштування", icon: settingsIcon },
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

  return (
    <div className="min-h-[100dvh] w-full">
      <BackgroundLayer />
      <AppSidebar
        nav={visibleNav}
        pathname={pathname}
        user={user}
        theme={theme}
        onToggleTheme={toggle}
        onLogout={logout}
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-20 w-64"
      />

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <AppSidebar
            nav={visibleNav}
            pathname={pathname}
            user={user}
            theme={theme}
            onToggleTheme={toggle}
            onLogout={logout}
            className="absolute right-0 top-0 bottom-0 w-72"
          />
        </div>
      )}

      <div className="flex min-w-0 flex-col md:pl-64">
        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileBottomBar nav={visibleNav} pathname={pathname} onOpenSidebar={() => setMobileOpen(true)} />
    </div>
  );
}
