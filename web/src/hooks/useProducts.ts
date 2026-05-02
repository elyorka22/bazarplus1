"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  getDemoCategories,
  getDemoPopularProducts,
  getDemoProductById,
  getDemoProductsPage,
  isDemoDataEnabled,
} from "@/lib/demo-data";
import type { Category, Paginated, Product } from "@/lib/types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      if (isDemoDataEnabled()) return getDemoCategories();
      const { data } = await api.get<Category[]>("/categories");
      return data;
    },
    staleTime: 60_000,
  });
}

export function useProductsInfinite(categoryId?: string | null) {
  return useInfiniteQuery({
    queryKey: ["products", categoryId ?? "all"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (isDemoDataEnabled()) {
        return getDemoProductsPage(
          pageParam as number,
          12,
          categoryId,
        );
      }
      const { data } = await api.get<Paginated<Product>>("/products", {
        params: {
          page: pageParam,
          limit: 12,
          ...(categoryId ? { categoryId } : {}),
        },
      });
      return data;
    },
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    staleTime: 30_000,
  });
}

export function useProductsPrefetchPopular() {
  return useQuery({
    queryKey: ["products", "popular"],
    queryFn: async () => {
      if (isDemoDataEnabled()) return getDemoPopularProducts();
      const { data } = await api.get<Paginated<Product>>("/products", {
        params: { page: 1, limit: 24 },
      });
      return data.items;
    },
    staleTime: 30_000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (isDemoDataEnabled()) {
        const product = getDemoProductById(id!);
        if (!product) throw new Error("Not found");
        return product;
      }
      const { data } = await api.get<Product>(`/products/${id}`);
      return data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
