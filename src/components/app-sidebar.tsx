import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Building2, LogOut, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { roleLabel } from "@/lib/format";

interface NavItem { to: string; label: string; icon: LucideIcon; roles?: string[]; }
interface SidebarUser { role: string; name?: string | null; email: string; }

export function AppSidebar({
  nav,
  pathname,
  user,
  theme,
  onToggleTheme,
  onLogout,
  className = "",
}: {
  nav: NavItem[];
  pathname: string;
  user: SidebarUser;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => Promise<void> | void;
  className?: string;
}) {
  const navigate = useNavigate();

  return (
    <aside className={`flex h-full flex-col bg-sidebar/95 text-sidebar-foreground border-sidebar-border backdrop-blur-xl shadow-[inset_-1px_0_0_var(--color-sidebar-border)] ${className}`}>
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
          {nav.map((n) => {
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
          <Button variant="outline" size="sm" className="flex-1" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={async () => { await onLogout(); navigate("/auth"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
