import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/admin/order-status";

const styles: Record<OrderStatus, string> = {
  CREATED: "bg-neutral-100 text-neutral-800",
  ACCEPTED: "bg-blue-100 text-blue-900",
  PREPARING: "bg-amber-100 text-amber-900",
  ON_THE_WAY: "bg-sky-100 text-sky-900",
  DELIVERED: "bg-primary/15 text-primary",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
