"use client";

import { useEffect } from "react";
import { RouteErrorFallback } from "@/components/route-error-fallback";
import { uz } from "@/lib/i18n/uz";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[orders]", error);
  }, [error]);

  return (
    <RouteErrorFallback
      title={uz.errors.ordersTitle}
      message={error.message || uz.errors.ordersMessage}
      reset={reset}
    />
  );
}
