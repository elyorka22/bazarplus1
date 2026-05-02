"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";
import { uz } from "@/lib/i18n/uz";

export function UserShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      const next = encodeURIComponent(pathname ?? "/");
      router.replace(`/login?next=${next}`);
    }
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-neutral-500">{uz.session.checking}</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:pb-10">{children}</main>
      <BottomNav />
    </>
  );
}
