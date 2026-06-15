import { useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { navigation } from "@/layouts/navigation";
import { cn } from "@/utils/cn";

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const { allBranchesValue, branches, selectedBranchId, setSelectedBranchId } = useBranch();

  const activeBranch = useMemo(() => {
    if (hasRole("ADMIN") || hasRole("TECHNICIAN")) {
      return user?.branch;
    }
    if (selectedBranchId && selectedBranchId !== allBranchesValue) {
      return branches.find((b) => b.id === selectedBranchId);
    }
    return branches.find((b) => b.isMainBranch) || branches[0];
  }, [user, branches, selectedBranchId, allBranchesValue, hasRole]);

  const brandLogo = activeBranch?.metadata?.logo || "";
  const brandTitle = activeBranch?.metadata?.title || activeBranch?.name || "Repair ERP";
  const brandSlogan = activeBranch?.metadata?.slogan || activeBranch?.code || "Backend modules as navigation";

  const visibleNavigation = useMemo(() => {
    return navigation
      .filter((item) => hasRole(...item.roles))
      .map((item) => {
        if (item.path === "/staff") {
          return {
            ...item,
            label: user?.role === "OWNER" ? "Admins" : "Technicians",
          };
        }
        return item;
      });
  }, [hasRole, user?.role]);
  const showBranchSelector = hasRole("OWNER") && branches.length > 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Backdrop overlay for mobile screen */}
      {open ? (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-[2px] transition-opacity lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside className={cn("fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-[var(--border)] bg-white transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <Link to="/branch/portal" className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-5">
          {brandLogo ? (
            <img src={brandLogo} alt="Logo" className="h-8 w-8 rounded-lg object-contain bg-slate-50 p-0.5 border border-slate-100 shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white text-[10px] font-black shrink-0 shadow-inner">
              {brandTitle.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate" title={brandTitle}>{brandTitle}</p>
            <p className="text-[10px] text-[var(--muted)] truncate" title={brandSlogan}>{brandSlogan}</p>
          </div>
        </Link>
        {showBranchSelector ? (
          <div className="border-b border-[var(--border)] p-3 lg:hidden">
            <p className="mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Branch</p>
            <Select
              className="w-full"
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                window.location.reload();
              }}
            >
              <option value={allBranchesValue}>All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
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
        <div className="border-t border-[var(--border)] p-3">
          <Button variant="secondary" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
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
          {showBranchSelector ? (
            <Select
              className="hidden w-56 sm:block"
              value={selectedBranchId}
              onChange={(event) => {
                setSelectedBranchId(event.target.value);
                window.location.reload();
              }}
            >
              <option value={allBranchesValue}>All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          ) : null}
        </header>
        <main className="min-w-0 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
