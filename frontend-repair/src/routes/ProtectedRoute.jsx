import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute() {
  const { booting, isAuthenticated } = useAuth();

  if (booting) {
    return <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading Repair ERP...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}
