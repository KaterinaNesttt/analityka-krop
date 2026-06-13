import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: string[];
}

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
    <nav className="md:hidden asset-mobar py-2 max-h-40 min-w-92 fixed inset-x-3 bottom-3 z-30 grid grid-cols-5  text-sidebar-foreground">
      {items.map((n) => {
        const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
        return (
          <Link
            key={n.to}
            to={n.to}
            className={`flex min-h-14 max-w-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] leading-none transition-colors ${
              active
                ? "glass-outpress-edge text-sidebar-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <img src={n.icon} alt="" aria-hidden="true" className="h-7 w-7" />
            <span className="max-w-full truncate">{n.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Menu className="h-6 w-6" />
        <span>Меню</span>
      </button>
    </nav>
  );
}
