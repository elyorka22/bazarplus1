"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/types";

export type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  stock: string;
  imageUrl: string;
  categoryId: string;
};

const empty: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  stock: "0",
  imageUrl: "",
  categoryId: "",
};

export function ProductForm({
  title,
  categories,
  initial,
  submitLabel,
  onSubmit,
  isSubmitting,
}: {
  title: string;
  categories: Category[];
  initial?: Partial<ProductFormValues>;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => void;
  isSubmitting: boolean;
}) {
  const defaults = { ...empty, ...initial };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      name: String(fd.get("name") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      price: String(fd.get("price") ?? "").trim(),
      stock: String(fd.get("stock") ?? "0").trim(),
      imageUrl: String(fd.get("imageUrl") ?? "").trim(),
      categoryId: String(fd.get("categoryId") ?? "").trim(),
    });
  }

  return (
    <Card className="max-w-lg p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-neutral-700">Name</label>
          <Input name="name" required minLength={2} defaultValue={defaults.name} />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={defaults.description}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-700">Price</label>
            <Input
              name="price"
              type="number"
              required
              min={0}
              step={0.01}
              defaultValue={defaults.price}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Stock</label>
            <Input
              name="stock"
              type="number"
              required
              min={0}
              step={1}
              defaultValue={defaults.stock}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700">
            Image URL
          </label>
          <Input
            name="imageUrl"
            type="text"
            placeholder="https://…"
            defaultValue={defaults.imageUrl}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Paste a public image URL (same as API field <code>imageUrl</code>).
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700">Category</label>
          <select
            name="categoryId"
            required
            defaultValue={defaults.categoryId}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}
