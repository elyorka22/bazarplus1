"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { uz } from "@/lib/i18n/uz";

const links = [
  {
    href: "/",
    label: uz.nav.home,
    icon: Home,
    match: (p: string) => p === "/",
  },
  {
    href: "/products",
    label: uz.nav.shop,
    icon: ShoppingBag,
    match: (p: string) => p.startsWith("/products"),
  },
  {
    href: "/cart",
    label: uz.nav.cart,
    icon: ShoppingCart,
    match: (p: string) => p.startsWith("/cart"),
  },
  {
    href: "/orders",
    label: uz.nav.orders,
    icon: Package,
    match: (p: string) => p.startsWith("/orders"),
  },
  {
    href: "/profile",
    label: uz.nav.profile,
    icon: User,
    match: (p: string) => p.startsWith("/profile"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-lg justify-around py-2">
        {links.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-[64px] flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium",
                active ? "text-primary" : "text-neutral-500",
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
