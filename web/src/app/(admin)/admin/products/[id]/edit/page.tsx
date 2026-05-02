"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductForm } from "@/components/admin/product-form";
import { api, parseApiError } from "@/lib/api";
import type { Category, Product } from "@/lib/types";

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<Category[]>("/categories");
      return data;
    },
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await api.get<Product>(`/products/${id}`);
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.patch<Product>(`/products/${id}`, body);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      void qc.invalidateQueries({ queryKey: ["product", id] });
      toast.success("Product updated");
      router.push("/admin/products");
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  if (isLoading || !categories?.length) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  if (!product) {
    return <p className="text-sm text-red-600">Product not found.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Edit product</h1>
      <div className="mt-8">
        <ProductForm
          title={product.name}
          categories={categories}
          submitLabel={update.isPending ? "Saving…" : "Save changes"}
          isSubmitting={update.isPending}
          initial={{
            name: product.name,
            description: product.description ?? "",
            price: product.price,
            stock: String(product.stock),
            imageUrl: product.imageUrl ?? "",
            categoryId: product.categoryId,
          }}
          onSubmit={(v) => {
            update.mutate({
              name: v.name,
              description: v.description || undefined,
              price: Number(v.price),
              stock: Number(v.stock),
              imageUrl: v.imageUrl || undefined,
              categoryId: v.categoryId,
            });
          }}
        />
      </div>
    </div>
  );
}
