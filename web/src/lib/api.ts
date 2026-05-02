import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-tokens";
import { uz } from "@/lib/i18n/uz";
import { getPublicApiUrl } from "@/lib/env";

export const api = axios.create({
  baseURL: getPublicApiUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(
      typeof window !== "undefined"
        ? `${window.location.origin}/api/auth/refresh`
        : "/api/auth/refresh",
      {
        method: "POST",
        credentials: "include",
      },
    );
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as { accessToken?: string };
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("access-token-updated"));
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = original?.url ?? "";
    const isRefreshEndpoint =
      url.includes("/auth/refresh") || url.includes("/api/auth/refresh");

    if (
      !original ||
      error.response?.status !== 401 ||
      isRefreshEndpoint ||
      original._retry
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshing) {
      refreshing = tryRefresh().finally(() => {
        refreshing = null;
      });
    }
    const ok = await refreshing;
    if (!ok) {
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }
      return Promise.reject(error);
    }

    const token = getAccessToken();
    if (token) {
      original.headers.Authorization = `Bearer ${token}`;
    }
    return api(original);
  },
);

export function parseApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    const msg =
      data?.error?.message ??
      (typeof data?.message === "string" ? data.message : null);
    if (msg) return msg;
    if (err.code === "ECONNABORTED") return uz.api.timeout;
    if (!err.response) {
      return uz.api.offline;
    }
  }
  if (err instanceof Error) return err.message;
  return uz.api.generic;
}

/** Extract order id from successful or idempotent order payloads. */
export function extractOrderIdFromBody(data: unknown): string | undefined {
  if (
    data &&
    typeof data === "object" &&
    "id" in data &&
    typeof (data as { id: unknown }).id === "string"
  ) {
    return (data as { id: string }).id;
  }
  return undefined;
}
