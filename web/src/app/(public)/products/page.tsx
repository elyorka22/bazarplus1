"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { ProductCard } from "@/components/product/product-card";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";
import { useCategories, useProductsInfinite } from "@/hooks/useProducts";
import { uz } from "@/lib/i18n/uz";
import type { Product } from "@/lib/types";

function ProductsInner() {
  const params = useSearchParams();
  const categoryId = params.get("categoryId");
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useProductsInfinite(categoryId);
  const categories = useCategories();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const items = data?.pages.flatMap((p) => p.items as Product[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/products"
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            !categoryId
              ? "bg-primary text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          {uz.products.all}
        </Link>
        {(categories.data ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/products?categoryId=${c.id}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              categoryId === c.id
                ? "bg-primary text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {status === "pending" ? (
        <ProductGridSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-8" />
          {isFetchingNextPage ? (
            <p className="py-4 text-center text-sm text-neutral-500">
              {uz.products.loadingMore}
            </p>
          ) : null}
          {!isFetchingNextPage && items.length === 0 ? (
            <p className="py-12 text-center text-neutral-500">
              {uz.products.emptyCategory}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <ProductsInner />
    </Suspense>
  );
}
