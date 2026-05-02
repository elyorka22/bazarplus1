"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { useCart } from "@/hooks/useCart";
import { uz } from "@/lib/i18n/uz";
import { formatMoney } from "@/lib/utils";

export default function CartPage() {
  const { lines, subtotal } = useCart();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{uz.cart.title}</h1>
      {lines.length === 0 ? (
        <Card className="p-8 text-center text-neutral-600">
          <p>{uz.cart.empty}</p>
          <Link
            href="/products"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-soft hover:bg-primary-dark"
          >
            {uz.cart.browse}
          </Link>
        </Card>
      ) : (
        <>
          <Card className="divide-y divide-neutral-100 p-4">
            {lines.map((line) => (
              <CartLineItem key={line.productId} line={line} />
            ))}
          </Card>
          <div className="flex flex-col items-end gap-4">
            <p className="text-lg font-semibold text-ink">
              {uz.cart.subtotal}{" "}
              <span className="text-primary">{formatMoney(subtotal)}</span>
            </p>
            <Link
              href="/checkout"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-white shadow-soft hover:bg-primary-dark"
            >
              {uz.cart.checkout}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
