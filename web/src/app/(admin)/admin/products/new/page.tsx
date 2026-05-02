"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductForm } from "@/components/admin/product-form";
import { api, parseApiError } from "@/lib/api";
import type { Category } from "@/lib/types";

export default function NewProductPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<Category[]>("/categories");
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      price: number;
      stock: number;
      imageUrl?: string;
      categoryId: string;
    }) => {
      const { data } = await api.post("/products", body);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Product created");
      router.push("/admin/products");
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  if (!categories?.length) {
    return <p className="text-sm text-neutral-500">Loading categories…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">New product</h1>
      <div className="mt-8">
        <ProductForm
          title="Create product"
          categories={categories}
          submitLabel={create.isPending ? "Saving…" : "Create"}
          isSubmitting={create.isPending}
          onSubmit={(v) => {
            create.mutate({
              name: v.name,
              description: v.description || undefined,
              price: Number(v.price),
              stock: Number(v.stock) || 0,
              imageUrl: v.imageUrl || undefined,
              categoryId: v.categoryId,
            });
          }}
        />
      </div>
    </div>
  );
}
