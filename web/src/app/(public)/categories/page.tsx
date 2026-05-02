"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useProducts";
import { uz } from "@/lib/i18n/uz";

export default function CategoriesPage() {
  const { data, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{uz.categoriesPage.title}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(data ?? []).map((c) => (
          <Link key={c.id} href={`/products?categoryId=${c.id}`}>
            <Card className="flex h-28 items-center justify-center p-4 text-center font-semibold text-ink transition hover:border-primary/40">
              {c.name}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
