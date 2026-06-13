import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: string[];
}

interface SidebarUser {
  role: string;
  name?: string | null;
  email: string;
}

interface AppSidebarProps {
  nav: NavItem[];
  pathname: string;
  user: SidebarUser;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => Promise<void> | void;
  className?: string;
}

const SidebarNavItem = React.memo(function SidebarNavItem({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 px-4 text-sm font-medium",
        "transition-colors duration-150 active:scale-[0.99]",
        active
          ? " glass-outpress-edge rounded-[0.8rem] text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:text-sidebar-accent-foreground",
      )}
    >
      <img
        src={item.icon}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
        className="h-8 w-8 shrink-0 opacity-95"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
});

export const AppSidebar = React.memo(function AppSidebar({
  nav,
  pathname,
  user,
  theme,
  onToggleTheme,
  onLogout,
  className = "",
}: AppSidebarProps) {
  const navigate = useNavigate();

  const userTitle = user.name ?? user.email;

  const handleLogout = React.useCallback(async () => {
    await onLogout();
    navigate("/auth");
  }, [navigate, onLogout]);

  const visibleNav = React.useMemo(() => {
    return nav.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [nav, user.role]);

  return (
    <aside
      className={cn(
        "asset-sidebar flex max-h-190 max-w-46 ml-10 mt-2 flex-col rounded-3xl text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-3 px-3">
        <div className="min-w-0">
          <div className="truncate font-semibold leading-tight tracking-[0.08em] text-white">
            Аналітика
          </div>
          <div className="truncate text-[8px] uppercase tracking-[0.18em] text-white/70">
            Кропивницький
          </div>
        </div>
      </div>

      <nav className="flex min-h-0  flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-0.5 py-0.5">
        {visibleNav.map((item) => {
          const active =
            pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));

          return <SidebarNavItem key={item.to} item={item} active={active} />;
        })}
      </nav>

      <div className="shrink-0 space-y-3  p-4">
        <Button className="px-4 py-3 text-sm w-full justify-between text-sidebar-foreground/76">
          <div className="truncate  font-medium text-sidebar-foreground">{userTitle}</div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Вийти"
            className="border-0 bg-transparent text-destructive/50 shadow-none hover:bg-transparent hover:text-destructive/90"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </Button>

        <div className="flex gap-2">
          {/*
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Перемкнути тему"
            className="asset-cta-pill flex-1 border-0 bg-transparent text-sidebar-foreground shadow-none hover:bg-transparent hover:text-sidebar-foreground"
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
                 */}
        </div>
      </div>
    </aside>
  );
});
