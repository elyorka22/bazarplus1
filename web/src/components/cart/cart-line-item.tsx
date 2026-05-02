"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartLine } from "@/contexts/cart-context";
import { useCart } from "@/hooks/useCart";
import { uz } from "@/lib/i18n/uz";
import { formatMoney } from "@/lib/utils";

export function CartLineItem({ line }: { line: CartLine }) {
  const { setQty, remove } = useCart();
  const unit = parseFloat(line.product.price);

  return (
    <div className="flex gap-3 border-b border-neutral-100 py-4 last:border-0">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-50">
        {line.product.imageUrl ? (
          <Image
            src={line.product.imageUrl}
            alt={line.product.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink line-clamp-2">{line.product.name}</p>
        <p className="text-sm text-neutral-500">
          {formatMoney(line.product.price)} {uz.cart.each}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-neutral-200">
            <button
              type="button"
              className="px-2 py-1.5 text-neutral-600 hover:bg-neutral-50"
              aria-label={uz.cart.decrease}
              onClick={() => setQty(line.productId, line.quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-8 text-center text-sm font-medium">
              {line.quantity}
            </span>
            <button
              type="button"
              className="px-2 py-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
              aria-label={uz.cart.increase}
              disabled={line.quantity >= line.product.stock}
              onClick={() => setQty(line.productId, line.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => remove(line.productId)}
            aria-label={uz.cart.remove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="text-right text-sm font-semibold text-ink">
        {formatMoney(unit * line.quantity)}
      </div>
    </div>
  );
}
