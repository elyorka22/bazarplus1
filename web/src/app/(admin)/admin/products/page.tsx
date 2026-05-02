"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { api, parseApiError } from "@/lib/api";
import type { Paginated, Product } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data: d } = await api.get<Paginated<Product>>(
        "/products?page=1&limit=100",
      );
      return d;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Product deleted");
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage catalog and stock.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-soft hover:bg-primary-dark"
        >
          Add product
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-neutral-500">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(p.price)}</td>
                  <td className="px-4 py-3 tabular-nums">{p.stock}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="mr-2 text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        if (
                          typeof window !== "undefined" &&
                          window.confirm(`Delete “${p.name}”?`)
                        ) {
                          remove.mutate(p.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
