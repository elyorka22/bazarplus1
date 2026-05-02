"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { CourierRealtimeProvider } from "@/contexts/courier-realtime-context";
import { api } from "@/lib/api";
import type { CourierRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/courier", label: "Active" },
  { href: "/courier/history", label: "History" },
] as const;

export function CourierShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  const {
    data: courierProfile,
    isLoading: profileLoading,
    isError: profileError,
  } = useQuery({
    queryKey: ["courier", "profile"],
    queryFn: async () => {
      const { data } = await api.get<CourierRow>("/courier/me");
      return data;
    },
    retry: false,
    enabled: ready && !!user,
  });

  useEffect(() => {
    if (!ready || profileLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profileError || !courierProfile) {
      router.replace("/");
    }
  }, [ready, profileLoading, user, profileError, courierProfile, router]);

  if (!ready || profileLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (profileError || !courierProfile) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-ink">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Courier
            </p>
            <p className="truncate text-sm font-semibold">{courierProfile.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              Home
            </Link>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto mt-3 flex max-w-lg gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/courier"
                ? pathname === "/courier"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "min-h-11 flex-1 rounded-lg px-4 py-3 text-center text-sm font-medium transition",
                  active
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <CourierRealtimeProvider>
        <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">
          {children}
        </main>
      </CourierRealtimeProvider>
    </div>
  );
}
