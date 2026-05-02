"use client";

import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { uz } from "@/lib/i18n/uz";

export function Header() {
  const { user, ready } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
        <Link href="/" className="text-lg font-semibold text-ink">
          {uz.nav.brand}
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 sm:flex">
          <Link href="/products" className="hover:text-primary">
            {uz.nav.shop}
          </Link>
          <Link href="/categories" className="hover:text-primary">
            {uz.nav.categories}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-100 bg-white shadow-soft"
            aria-label={uz.nav.cartAria}
          >
            <ShoppingCart className="h-5 w-5 text-ink" />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>
          {ready && user ? (
            <Link
              href="/profile"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-neutral-100 bg-white shadow-soft"
              aria-label={uz.nav.profileAria}
            >
              <User className="h-5 w-5 text-ink" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-ink hover:bg-neutral-50"
            >
              {uz.nav.signIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
