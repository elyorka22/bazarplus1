"use client";

import { useQuery } from "@tanstack/react-query";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import type { CourierOrderRow, Paginated } from "@/lib/types";

export default function CourierHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["courier", "orders", "history"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "50");
      params.set("scope", "history");
      const { data: d } = await api.get<Paginated<CourierOrderRow>>(
        `/courier/orders?${params.toString()}`,
      );
      return d;
    },
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Completed</h1>
      <p className="mt-1 text-sm text-neutral-500">Delivered orders archive.</p>

      <div className="mt-6 space-y-3">
        {isLoading && (
          <p className="text-sm text-neutral-500">Loading…</p>
        )}
        {!isLoading && data?.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
            No completed deliveries yet.
          </p>
        )}
        {data?.items.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-neutral-500">
                  #{order.id.slice(0, 8)}…
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-3 text-sm font-semibold tabular-nums">
              {formatMoney(order.totalPrice)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
