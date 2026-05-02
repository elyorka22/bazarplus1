"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { uz } from "@/lib/i18n/uz";
import { formatMoney } from "@/lib/utils";
import type { OrderDetail, OrderStatus } from "@/lib/types";

const OrderTracking = dynamic(
  () =>
    import("@/components/order/order-tracking").then((m) => m.OrderTracking),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full rounded-lg" /> },
);

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/orders/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/orders"
          className="text-sm font-medium text-primary hover:underline"
        >
          {uz.orders.allOrders}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">{uz.orders.detailTitle}</h1>
        <p className="text-xs text-neutral-500">{order.id}</p>
      </div>

      <OrderTracking
        orderId={order.id}
        initialStatus={order.status as OrderStatus}
      />

      <Card className="p-4">
        <p className="font-semibold text-ink">{uz.orders.itemsTitle}</p>
        <ul className="mt-3 divide-y divide-neutral-100">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between py-2 text-sm text-neutral-700"
            >
              <span>{uz.orders.qty(item.quantity)}</span>
              <span>{formatMoney(item.unitPrice)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-right text-lg font-semibold text-primary">
          {formatMoney(order.totalPrice)}
        </p>
      </Card>
    </div>
  );
}
