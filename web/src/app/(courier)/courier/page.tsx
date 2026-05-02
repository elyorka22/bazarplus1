"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CourierOrderCard } from "@/components/courier/order-card";
import { Button } from "@/components/ui/button";
import { useCourierRealtimeEmit } from "@/contexts/courier-realtime-context";
import { api, parseApiError } from "@/lib/api";
import { courierActionLabelForNext } from "@/lib/courier-order-ui";
import { getNextOrderStatus } from "@/lib/admin/order-status";
import { isGeolocationDisabled, watchCourierLocation } from "@/lib/location";
import type { CourierOrderRow, OrderStatus, Paginated } from "@/lib/types";

export default function CourierActivePage() {
  const qc = useQueryClient();
  const { emitLocation } = useCourierRealtimeEmit();
  const [geoDenied, setGeoDenied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["courier", "orders", "active"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "50");
      params.set("scope", "active");
      const { data: d } = await api.get<Paginated<CourierOrderRow>>(
        `/courier/orders?${params.toString()}`,
      );
      return d;
    },
  });

  const hasOnTheWay = useMemo(
    () => data?.items.some((o) => o.status === "ON_THE_WAY") ?? false,
    [data?.items],
  );

  useEffect(() => {
    if (!hasOnTheWay || isGeolocationDisabled()) return;
    const handle = watchCourierLocation({
      intervalMs: 8000,
      onCoords: (lat, lng) => emitLocation(lat, lng),
      onPermissionDenied: () => setGeoDenied(true),
      onError: () => {
        /* socket / GPS flakiness — next tick retries */
      },
    });
    return () => handle.stop();
  }, [hasOnTheWay, emitLocation]);

  const updateStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      await api.patch(`/courier/orders/${orderId}/status`, { status });
    },
    onMutate: async ({ orderId, status }) => {
      await qc.cancelQueries({ queryKey: ["courier", "orders"] });
      const prev = qc.getQueryData<Paginated<CourierOrderRow>>([
        "courier",
        "orders",
        "active",
      ]);
      if (prev) {
        qc.setQueryData<Paginated<CourierOrderRow>>(
          ["courier", "orders", "active"],
          {
            ...prev,
            items: prev.items.map((o) =>
              o.id === orderId ? { ...o, status } : o,
            ),
          },
        );
      }
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["courier", "orders", "active"], ctx.prev);
      }
      toast.error(parseApiError(err));
    },
    onSuccess: () => {
      toast.success("Status updated");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["courier", "orders"] });
    },
  });

  const firstActionable = data?.items.find((o) => getNextOrderStatus(o.status));

  const advance = (orderId: string, next: OrderStatus) => {
    updateStatus.mutate({ orderId, status: next });
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Active deliveries</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Live location shares while status is On the way.
      </p>

      {geoDenied && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Location permission denied — enable it in browser settings to share
          live GPS during delivery.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isLoading && (
          <p className="text-sm text-neutral-500">Loading orders…</p>
        )}
        {!isLoading && data?.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
            No active assignments. You’ll see new orders here when assigned.
          </p>
        )}
        {data?.items.map((order) => (
          <CourierOrderCard
            key={order.id}
            order={order}
            disabled={updateStatus.isPending}
            onAdvance={advance}
          />
        ))}
      </div>

      {firstActionable && getNextOrderStatus(firstActionable.status) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="mx-auto max-w-lg">
            <p className="mb-2 font-mono text-xs text-neutral-500">
              Next · #{firstActionable.id.slice(0, 8)}…
            </p>
            <Button
              type="button"
              className="h-14 w-full rounded-xl text-base font-semibold"
              disabled={updateStatus.isPending}
              onClick={() =>
                advance(
                  firstActionable.id,
                  getNextOrderStatus(firstActionable.status)!,
                )
              }
            >
              {courierActionLabelForNext(
                getNextOrderStatus(firstActionable.status)!,
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
