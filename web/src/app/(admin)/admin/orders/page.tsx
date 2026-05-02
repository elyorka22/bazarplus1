"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AdminOrdersErrorBoundary } from "@/components/admin/admin-orders-error-boundary";
import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { useAdminOrdersRealtime } from "@/hooks/use-admin-orders-realtime";
import { api, parseApiError } from "@/lib/api";
import { patchOrderInAllCachedLists } from "@/lib/admin-orders-cache";
import { getNextOrderStatus } from "@/lib/admin/order-status";
import type {
  AdminOrderListItem,
  CourierRow,
  OrderStatus,
  Paginated,
} from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

const STATUS_FILTER: (OrderStatus | "")[] = [
  "",
  "CREATED",
  "ACCEPTED",
  "PREPARING",
  "ON_THE_WAY",
  "DELIVERED",
];

export default function AdminOrdersPage() {
  return (
    <AdminOrdersErrorBoundary>
      <AdminOrdersPageInner />
    </AdminOrdersErrorBoundary>
  );
}

function AdminOrdersPageInner() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);

  const {
    connection,
    newOrderBadge,
    clearNewBadge,
    flashOrderIds,
    statusFlashIds,
  } = useAdminOrdersRealtime({ statusFilter: status, page });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (status) params.set("status", status);
      const { data: d } = await api.get<Paginated<AdminOrderListItem>>(
        `/admin/orders?${params.toString()}`,
      );
      return d;
    },
  });

  const { data: couriers } = useQuery({
    queryKey: ["admin", "couriers", "available"],
    queryFn: async () => {
      const { data: d } = await api.get<CourierRow[]>("/courier/available");
      return d;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: OrderStatus }) => {
      await api.patch(`/orders/${id}/status`, { status: next });
    },
    onSuccess: (_, vars) => {
      patchOrderInAllCachedLists(qc, vars.id, { status: vars.next });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Status updated");
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  const assignCourier = useMutation({
    mutationFn: async ({
      orderId,
      courierId,
    }: {
      orderId: string;
      courierId: string;
    }) => {
      await api.post(`/orders/${orderId}/courier`, { courierId });
    },
    onSuccess: (_, vars) => {
      const list = qc.getQueryData<CourierRow[]>([
        "admin",
        "couriers",
        "available",
      ]);
      const name =
        list?.find((c) => c.id === vars.courierId)?.name ?? "Courier";
      patchOrderInAllCachedLists(qc, vars.orderId, {
        courier: { id: vars.courierId, name },
      });
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      void qc.invalidateQueries({
        queryKey: ["admin", "couriers", "available"],
      });
      toast.success("Courier assigned");
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  const onNext = useCallback(
    (row: AdminOrderListItem) => {
      const next = getNextOrderStatus(row.status);
      if (!next) return;
      updateStatus.mutate({ id: row.id, next });
    },
    [updateStatus],
  );

  return (
    <div>
      {connection === "reconnecting" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Reconnecting to live updates…
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">Orders</h1>
            {newOrderBadge > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                +{newOrderBadge} new
                <button
                  type="button"
                  className="ml-1 rounded hover:bg-white/20"
                  aria-label="Clear new count"
                  onClick={() => clearNewBadge()}
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Live updates enabled — filter by status and advance the pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600">
            Status{" "}
            <select
              className="ml-2 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as OrderStatus | "");
              }}
            >
              {STATUS_FILTER.map((s) => (
                <option key={s || "all"} value={s}>
                  {s || "All"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-neutral-500">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.items.map((row) => {
                const next = getNextOrderStatus(row.status);
                const canAssign =
                  !row.courier && row.status !== "DELIVERED" && couriers?.length;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-neutral-100 transition-colors duration-500",
                      flashOrderIds.has(row.id) &&
                        "border-l-4 border-l-primary bg-primary/5",
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{row.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <div>{row.customer.email}</div>
                      {row.customer.name && (
                        <div className="text-xs text-neutral-500">
                          {row.customer.name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          statusFlashIds.has(row.id) && "inline-block animate-pulse",
                        )}
                      >
                        <OrderStatusBadge status={row.status} />
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatMoney(row.totalPrice)}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {next && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-primary text-white hover:bg-primary/90"
                            disabled={updateStatus.isPending}
                            onClick={() => onNext(row)}
                          >
                            → {next.replace(/_/g, " ")}
                          </Button>
                        )}
                        {canAssign ? (
                          <AssignCourierControl
                            couriers={couriers!}
                            disabled={assignCourier.isPending}
                            onAssign={(courierId) =>
                              assignCourier.mutate({
                                orderId: row.id,
                                courierId,
                              })
                            }
                          />
                        ) : row.courier ? (
                          <span className="text-xs text-neutral-500">
                            {row.courier.name}
                          </span>
                        ) : null}
                        <Link
                          href={`/orders/${row.id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-ink hover:bg-neutral-50"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-neutral-600">
            Page {data.meta.page} / {data.meta.totalPages}
          </span>
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function AssignCourierControl({
  couriers,
  onAssign,
  disabled,
}: {
  couriers: CourierRow[];
  onAssign: (courierId: string) => void;
  disabled: boolean;
}) {
  const [cid, setCid] = useState(couriers[0]?.id ?? "");
  return (
    <div className="flex items-center gap-1">
      <select
        className="max-w-[140px] rounded border border-neutral-300 px-1 py-1 text-xs"
        value={cid}
        onChange={(e) => setCid(e.target.value)}
      >
        {couriers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || !cid}
        onClick={() => onAssign(cid)}
      >
        Assign
      </Button>
    </div>
  );
}
