"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/map", label: "Map" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/couriers", label: "Couriers" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-0 flex h-screen w-52 flex-col border-r border-neutral-200 bg-white px-3 py-6">
          <div className="mb-8 px-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Admin
            </p>
            <p className="mt-1 font-semibold text-ink">BazarPlus</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-neutral-600 hover:bg-neutral-50",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2 border-t border-neutral-100 pt-4">
            <p className="truncate px-2 text-xs text-neutral-500">{user.email}</p>
            <Link
              href="/"
              className="block px-3 py-2 text-sm text-neutral-600 hover:underline"
            >
              ← Storefront
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
