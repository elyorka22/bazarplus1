"use client";

import { useEffect } from "react";
import { RouteErrorFallback } from "@/components/route-error-fallback";
import { uz } from "@/lib/i18n/uz";

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[product]", error);
  }, [error]);

  return (
    <RouteErrorFallback
      title={uz.errors.productTitle}
      message={error.message || uz.errors.productMessage}
      reset={reset}
    />
  );
}
