import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Languages,
  FileText,
  Image,
  Globe,
  Users,
  Shield,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, exact: true },
  { label: "Translations", to: "/translations", icon: Languages },
  { label: "Pages", to: "/pages", icon: FileText },
  { label: "Media", to: "/media", icon: Image },
  { label: "Locales", to: "/locales", icon: Globe },
  { label: "Users", to: "/users", icon: Users },
  { label: "Groups", to: "/groups", icon: Shield },
] as const;

export function Sidebar() {
  const { location } = useRouterState();

  function isActive(to: string, exact?: boolean) {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary">
            <Settings className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">better-cms</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to, "exact" in item ? item.exact : undefined);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
