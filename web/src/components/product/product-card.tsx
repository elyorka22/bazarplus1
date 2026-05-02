"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { formatMoney } from "@/lib/utils";
import { uz } from "@/lib/i18n/uz";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();

  return (
    <Card className="overflow-hidden">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/3] w-full bg-neutral-50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              {uz.product.noImage}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-ink">
            {product.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-primary">
            {formatMoney(product.price)}
          </p>
          <p className="text-xs text-neutral-500">
            {product.stock > 0
              ? uz.product.inStock(product.stock)
              : uz.product.outOfStock}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <Button
          className="w-full gap-2"
          size="sm"
          disabled={product.stock < 1}
          onClick={() => {
            add(product, 1);
            toast.success(uz.product.addedToast, { description: product.name });
          }}
        >
          <Plus className="h-4 w-4" />
          {uz.product.add}
        </Button>
      </div>
    </Card>
  );
}
