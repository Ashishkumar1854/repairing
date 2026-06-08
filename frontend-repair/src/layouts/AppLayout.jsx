import { useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { navigation } from "@/layouts/navigation";
import { cn } from "@/utils/cn";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const visibleNavigation = useMemo(() => navigation.filter((item) => hasRole(...item.roles)), [hasRole]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className={cn("fixed inset-y-0 left-0 z-30 w-72 border-r border-[var(--border)] bg-white transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <Link to="/dashboard" className="flex h-16 items-center border-b border-[var(--border)] px-5">
          <div>
            <p className="text-lg font-bold">Repair ERP</p>
            <p className="text-xs text-[var(--muted)]">Backend modules as navigation</p>
          </div>
        </Link>
        <nav className="h-[calc(100vh-4rem)] overflow-y-auto p-3">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn("mb-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100", isActive && "bg-blue-50 text-[var(--primary)]")
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between border-b border-[var(--border)] bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen((value) => !value)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm font-semibold">{user?.business?.name || "Repair Business"}</p>
              <p className="text-xs text-[var(--muted)]">{user?.fullName} · {user?.role}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </header>
        <main className="min-w-0 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
