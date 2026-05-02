import type { OrderStatus } from "@/lib/types";

const CHAIN: OrderStatus[] = [
  "CREATED",
  "ACCEPTED",
  "PREPARING",
  "ON_THE_WAY",
  "DELIVERED",
];

/** Next status in the admin flow (matches API `assertAdminTransition`). */
export function getNextOrderStatus(
  current: OrderStatus,
): OrderStatus | null {
  const i = CHAIN.indexOf(current);
  if (i < 0 || i >= CHAIN.length - 1) return null;
  return CHAIN[i + 1] ?? null;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  CREATED: "Created",
  ACCEPTED: "Accepted",
  PREPARING: "Preparing",
  ON_THE_WAY: "On the way",
  DELIVERED: "Delivered",
};
