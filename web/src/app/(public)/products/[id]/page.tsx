"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/useCart";
import { useProduct } from "@/hooks/useProducts";
import { uz } from "@/lib/i18n/uz";
import { formatMoney } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { data: product, isLoading } = useProduct(id);
  const { add } = useCart();

  if (isLoading || !product) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="relative aspect-square bg-neutral-50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-400">
              {uz.product.noImage}
            </div>
          )}
        </div>
      </Card>
      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/products" className="hover:text-primary">
            {uz.product.backToShop}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">{product.name}</h1>
        <p className="mt-4 text-3xl font-semibold text-primary">
          {formatMoney(product.price)}
        </p>
        {product.description ? (
          <p className="mt-4 text-neutral-600">{product.description}</p>
        ) : null}
        <p className="mt-4 text-sm text-neutral-500">
          {product.stock > 0
            ? uz.product.available(product.stock)
            : uz.product.outOfStockLong}
        </p>
        <Button
          className="mt-8 w-full max-w-sm gap-2 sm:w-auto"
          size="lg"
          disabled={product.stock < 1}
          onClick={() => {
            add(product, 1);
            toast.success(uz.product.addedToast);
          }}
        >
          {uz.product.addToCart}
        </Button>
      </div>
    </div>
  );
}
