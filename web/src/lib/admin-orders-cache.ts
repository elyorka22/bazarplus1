import type { QueryClient } from "@tanstack/react-query";
import type { AdminOrderListItem, OrderStatus, Paginated } from "@/lib/types";

export function matchesStatusFilter(
  filter: OrderStatus | "",
  orderStatus: OrderStatus,
): boolean {
  if (!filter) return true;
  return filter === orderStatus;
}

/** Merge partial updates into every cached admin orders page that contains the order id. */
export function patchOrderInAllCachedLists(
  qc: QueryClient,
  orderId: string,
  patch: Partial<AdminOrderListItem>,
) {
  const entries = qc.getQueriesData<Paginated<AdminOrderListItem>>({
    queryKey: ["admin", "orders"],
    exact: false,
  });
  for (const [key, data] of entries) {
    if (!data) continue;
    const idx = data.items.findIndex((o) => o.id === orderId);
    if (idx < 0) continue;
    const nextItems = [...data.items];
    nextItems[idx] = { ...nextItems[idx], ...patch };
    qc.setQueryData(key, { ...data, items: nextItems });
  }
}

export function prependOrderOnFirstPage(
  qc: QueryClient,
  order: AdminOrderListItem,
) {
  const entries = qc.getQueriesData<Paginated<AdminOrderListItem>>({
    queryKey: ["admin", "orders"],
    exact: false,
  });
  for (const [key, data] of entries) {
    if (!data) continue;
    const qk = key as unknown as (string | number | OrderStatus | "")[];
    const page = qk[3] as number;
    const filter = qk[2] as OrderStatus | "";
    if (page !== 1) continue;
    if (!matchesStatusFilter(filter, order.status)) continue;
    if (data.items.some((o) => o.id === order.id)) continue;
    const limit = data.meta.limit;
    const nextItems = [order, ...data.items].slice(0, limit);
    qc.setQueryData(key, { ...data, items: nextItems });
  }
}
