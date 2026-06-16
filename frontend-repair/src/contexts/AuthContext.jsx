import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/services/modules";
import { clearSession, getAccessToken, getStoredUser, persistSession, updateStoredUser } from "@/services/session";

const AuthContext = createContext(null);

function normalizeRole(role) {
  return role;
}

function isServiceActive(user) {
  if (!user || user.role === "SUPER_ADMIN") return true;
  return Boolean(user.business?.subscription?.isServiceActive);
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const updateSubscription = useCallback((subscription) => {
    setUser((currentUser) => {
      if (!currentUser?.business) return currentUser;
      if (JSON.stringify(currentUser.business.subscription) === JSON.stringify(subscription)) {
        return currentUser;
      }

      const nextUser = {
        ...currentUser,
        business: {
          ...currentUser.business,
          subscription,
        },
      };
      updateStoredUser(nextUser);
      return nextUser;
    });
  }, []);

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
      const serviceActive = isServiceActive(response.data.user);
      navigate(
        role === "SUPER_ADMIN"
          ? "/super-admin/businesses"
          : role === "OWNER" && !serviceActive
          ? "/subscription"
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
      isServiceActive: isServiceActive(user),
      updateSubscription,
    }),
    [booting, loginMutation, navigate, updateSubscription, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
