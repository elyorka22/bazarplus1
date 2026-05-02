"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold text-ink">{uz.errors.title}</h1>
      <p className="max-w-md text-center text-sm text-neutral-600">
        {process.env.NODE_ENV === "development"
          ? error.message || uz.errors.devDetail
          : uz.errors.generic}
      </p>
      <div className="flex gap-3">
        <Button type="button" onClick={() => reset()}>
          {uz.errors.tryAgain}
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-ink hover:bg-neutral-50"
        >
          {uz.errors.home}
        </Link>
      </div>
    </div>
  );
}
