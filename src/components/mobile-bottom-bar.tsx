import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Menu } from "lucide-react";

interface NavItem { to: string; label: string; icon: LucideIcon; roles?: string[]; }

export function MobileBottomBar({
  nav,
  pathname,
  onOpenSidebar,
}: {
  nav: NavItem[];
  pathname: string;
  onOpenSidebar: () => void;
}) {
  const items = nav.slice(0, 4);

  return (
    <nav className="md:hidden fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-xl border border-border bg-background/90 p-1 shadow-[0_18px_40px_color-mix(in_oklch,var(--color-foreground)_14%,transparent)] backdrop-blur-xl">
      {items.map((n) => {
        const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] leading-none transition-colors ${
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="max-w-full truncate">{n.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Menu className="h-4 w-4" />
        <span>Меню</span>
      </button>
    </nav>
  );
}
