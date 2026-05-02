"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { uz } from "@/lib/i18n/uz";

type Props = {
  title?: string;
  message?: string;
  reset: () => void;
};

export function RouteErrorFallback({
  title = uz.errors.routeTitle,
  message = uz.errors.routeMessage,
  reset,
}: Props) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-red-100 bg-red-50/50 px-4 py-10 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="max-w-md text-sm text-neutral-600">{message}</p>
      <div className="flex flex-wrap justify-center gap-3">
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
