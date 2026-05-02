"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth-tokens";
import { bootstrapSession, loginWithPassword, logoutRequest, registerAccount } from "@/lib/auth-client";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const loadUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get<User>("/users/me");
      setUser(data);
    } catch {
      setUser(null);
      clearAccessToken();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await bootstrapSession().catch(() => undefined);
      if (!cancelled) {
        await loadUser();
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUser]);

  useEffect(() => {
    function onLogout() {
      setUser(null);
    }
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await loginWithPassword(email, password);
    await loadUser();
  }, [loadUser]);

  const register = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      await registerAccount(input);
      await loadUser();
    },
    [loadUser],
  );

  const logout = useCallback(async () => {
    const token = getAccessToken();
    clearAccessToken();
    setUser(null);
    await logoutRequest(token);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      register,
      logout,
      refetchUser: loadUser,
    }),
    [user, ready, login, register, logout, loadUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
