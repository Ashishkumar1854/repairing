import axios from "axios";
import { clearSession, getAccessToken, getRefreshToken, persistSession } from "@/services/session";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

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
