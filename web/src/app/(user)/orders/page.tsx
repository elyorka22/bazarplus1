"use client";

import { useQuery } from "@tanstack/react-query";
import { OrderCard } from "@/components/order/order-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { uz } from "@/lib/i18n/uz";
import type { OrderSummary, Paginated } from "@/lib/types";

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "me"],
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<OrderSummary>>(
        "/orders/me",
        { params: { page: 1, limit: 50 } },
      );
      return res;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{uz.orders.title}</h1>
      {items.length === 0 ? (
        <p className="text-neutral-600">{uz.orders.empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((o) => (
            <li key={o.id}>
              <OrderCard order={o} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
