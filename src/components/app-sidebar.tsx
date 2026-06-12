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
    <aside className={`asset-sidebar flex max-h-190 max-w-46 ml-10 mt-2 flex-col rounded-3xl text-sidebar-foreground shadow-[18px_18px_16px_black]  ${className}`}>
      <div className="px-3 h-16 flex items-center gap-3 ">
        <div>
          <div className="font-semibold leading-tight text-white tracking-[0.08em]">Аналітика</div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-white/70">Кропивницький</div>
        </div>
      </div>
      <ScrollArea className="flex-1 gap-0.5">
        <nav className="flex flex-col gap-0.5 px-0.5">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex w-full items-center gap-2 px-4 text-s font-medium transition-[transform,opacity] duration-200 active:scale-[0.98] ${
                  active
                    ? "asset-active-pill text-sidebar-primary-foreground"
                    : "min-h-11 text-sidebar-foreground hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-98" strokeWidth={1.8} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="space-y-3 p-4">
        <div className="asset-team-pill px-4 py-3 text-xs text-sidebar-foreground/76">
          <div className="truncate font-medium text-sidebar-foreground">{user.name ?? user.email}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="asset-cta-pill flex-1 border-0 bg-transparent text-sidebar-foreground shadow-none hover:bg-transparent hover:text-sidebar-foreground" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="asset-cta-pill flex-1 border-0 bg-transparent text-sidebar-foreground shadow-none hover:bg-transparent hover:text-sidebar-foreground" onClick={async () => { await onLogout(); navigate("/auth"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
