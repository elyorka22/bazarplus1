"use client";

import { useEffect } from "react";
import { RouteErrorFallback } from "@/components/route-error-fallback";
import { uz } from "@/lib/i18n/uz";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[checkout]", error);
  }, [error]);

  return (
    <RouteErrorFallback
      title={uz.errors.checkoutTitle}
      message={error.message || uz.errors.checkoutMessage}
      reset={reset}
    />
  );
}
