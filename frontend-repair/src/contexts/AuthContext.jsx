import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/modules";
import { clearSession, getAccessToken, getStoredUser, persistSession } from "@/services/session";

const AuthContext = createContext(null);

function normalizeRole(role) {
  return role;
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();
    if (!token || !storedUser) {
      setBooting(false);
      return;
    }

    setUser(storedUser);
    authApi
      .me()
      .then((response) => setUser(response.data.user))
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      persistSession(response.data.user, response.data.tokens);
      setUser(response.data.user);
      const role = normalizeRole(response.data.user?.role);
      navigate(
        role === "SUPER_ADMIN"
          ? "/super-admin/businesses"
          : ["OWNER", "ADMIN"].includes(role)
          ? "/branch/portal"
          : "/dashboard",
        { replace: true }
      );
    },
  });

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      login: (payload) => loginMutation.mutateAsync(payload),
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          clearSession();
          setUser(null);
          navigate("/login", { replace: true });
        }
      },
      hasRole: (...roles) => {
        if (!user) return false;
        return roles.includes(normalizeRole(user.role));
      },
    }),
    [booting, loginMutation, navigate, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
