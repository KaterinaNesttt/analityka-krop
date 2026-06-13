import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { getOfflineQueue, subscribeOfflineQueue } from "@/lib/offline-store";
import { syncOfflineQueue } from "@/lib/api";
import { toast } from "sonner";

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
  const { user, loading, logout, apiUnreachable } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncAttemptRef = useRef("");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (user.status !== "approved") navigate("/pending", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const update = () => {
      if (!navigator.onLine) syncAttemptRef.current = "";
      setOnline(navigator.onLine);
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!user) { setQueueCount(0); return; }
    const update = () => getOfflineQueue(user.id).then((rows) => setQueueCount(rows.length));
    update();
    return subscribeOfflineQueue(update);
  }, [user]);

  useEffect(() => {
    if (!user || !online || !queueCount || syncing) return;
    const key = `${user.id}:${queueCount}`;
    if (syncAttemptRef.current === key) return;
    syncAttemptRef.current = key;
    setSyncing(true);
    syncOfflineQueue(user.id)
      .then((count) => {
        if (count) {
          toast.success(`Синхронізовано: ${count}`);
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["approved-sales"] });
          queryClient.invalidateQueries({ queryKey: ["sales-district-options"] });
          queryClient.invalidateQueries({ queryKey: ["mod-list"] });
        }
      })
      .catch(() => toast.error("Не вдалося синхронізувати офлайн-чергу"))
      .finally(() => {
        getOfflineQueue(user.id).then((rows) => setQueueCount(rows.length));
        setSyncing(false);
      });
  }, [user, online, queueCount, syncing, queryClient]);

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
      {(!online || apiUnreachable || queueCount > 0 || syncing) && (
        <div className="fixed right-3 top-3 z-30 rounded-md border border-white/10 bg-black/70 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur-md">
          {syncing ? "Синхронізація…" : !online || apiUnreachable ? "Офлайн-режим" : "Очікує синхронізації"}
          {queueCount > 0 && <span className="ml-2 text-muted-foreground">{queueCount}</span>}
        </div>
      )}
      <MobileBottomBar nav={visibleNav} pathname={pathname} onOpenSidebar={() => setMobileOpen(true)} />
    </div>
  );
}
