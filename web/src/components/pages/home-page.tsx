"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";
import { SearchBar } from "@/components/search-bar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useProductsPrefetchPopular } from "@/hooks/useProducts";
import { uz } from "@/lib/i18n/uz";
import type { Product } from "@/lib/types";

export function HomePage() {
  const [q, setQ] = useState("");
  const categories = useCategories();
  const popular = useProductsPrefetchPopular();

  const filtered = useMemo(() => {
    const items = popular.data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((p: Product) =>
      p.name.toLowerCase().includes(query),
    );
  }, [popular.data, q]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="max-w-xl">
          <SearchBar value={q} onChange={setQ} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {uz.home.categoriesTitle}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))
              : (categories.data ?? []).map((c) => (
                  <Link key={c.id} href={`/products?categoryId=${c.id}`}>
                    <Card className="flex h-24 items-center justify-center p-4 text-center font-medium text-ink transition hover:border-primary/40">
                      {c.name}
                    </Card>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-ink">
          {q.trim() ? uz.home.searchResults : uz.home.popularPicks}
        </h2>
        <div className="mt-4">
          {popular.isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p: Product) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {!popular.isLoading && filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              {uz.home.noProductsSearch}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
