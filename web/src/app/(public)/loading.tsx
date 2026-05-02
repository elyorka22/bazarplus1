import { ProductGridSkeleton } from "@/components/product/product-grid-skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-10 max-w-xl animate-pulse rounded-lg bg-neutral-100" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
