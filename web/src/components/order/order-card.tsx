import Link from "next/link";
import { formatOrderStatus, uz } from "@/lib/i18n/uz";
import { formatMoney } from "@/lib/utils";
import type { OrderSummary } from "@/lib/types";

export function OrderCard({ order }: { order: OrderSummary }) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-lg border border-neutral-100 bg-white p-4 shadow-soft transition hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-neutral-500">
            {new Date(order.createdAt).toLocaleString("uz-UZ")}
          </p>
          <p className="mt-1 font-semibold text-ink">
            {formatOrderStatus(order.status)}
          </p>
          <p className="text-sm text-neutral-600">
            {uz.orders.itemCount(order.items.length)}
          </p>
        </div>
        <p className="font-medium text-primary">{formatMoney(order.totalPrice)}</p>
      </div>
    </Link>
  );
}
