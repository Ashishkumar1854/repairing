import axios from "axios";
import { clearSession, getAccessToken, getRefreshToken, persistSession } from "@/services/session";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
export const ALL_BRANCHES = "__all__";
const BRANCH_STORAGE_KEY = "repair_erp_selected_branch";
const BRANCH_SCOPED_PREFIXES = [
  "/analytics",
  "/billing",
  "/customers",
  "/inventory",
  "/repair",
  "/technicians",
  "/vendors",
];

export function getSelectedBranchId() {
  try {
    return localStorage.getItem(BRANCH_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setSelectedBranchId(branchId) {
  try {
    if (!branchId) {
      localStorage.removeItem(BRANCH_STORAGE_KEY);
      return;
    }
    localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
  } catch {
    // Ignore storage errors; backend still enforces role scope.
  }
}

function isBranchScopedUrl(url = "") {
  return BRANCH_SCOPED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const branchId = getSelectedBranchId();
  if (branchId && branchId !== ALL_BRANCHES && isBranchScopedUrl(config.url || "")) {
    config.params = { ...(config.params || {}), branchId };
    const method = String(config.method || "get").toLowerCase();
    const canPatchPayload = ["post", "patch", "put"].includes(method);
    const isPlainObject =
      config.data &&
      typeof config.data === "object" &&
      !Array.isArray(config.data) &&
      !(config.data instanceof FormData);

    if (canPatchPayload && isPlainObject && !config.data.branchId) {
      config.data = { ...config.data, branchId };
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken || originalRequest.url?.includes("/auth/refresh")) {
      clearSession();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const authData = response.data.data;
      persistSession(authData.user, authData.tokens);
      originalRequest.headers.Authorization = `Bearer ${authData.tokens.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearSession();
      return Promise.reject(refreshError);
    }
  }
);

export async function get(url, params) {
  const response = await api.get(url, { params });
  return response.data;
}

export async function post(url, payload) {
  const response = await api.post(url, payload);
  return response.data;
}

export async function patch(url, payload) {
  const response = await api.patch(url, payload);
  return response.data;
}

export async function del(url, params) {
  const response = await api.delete(url, { params });
  return response.data;
}
