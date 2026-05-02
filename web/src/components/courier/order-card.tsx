"use client";

import { OrderStatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { courierActionLabelForNext } from "@/lib/courier-order-ui";
import { getNextOrderStatus } from "@/lib/admin/order-status";
import type { CourierOrderRow } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

function snapshotAddress(snapshot: Record<string, unknown>): string {
  const line1 = typeof snapshot.line1 === "string" ? snapshot.line1 : "";
  const city = typeof snapshot.city === "string" ? snapshot.city : "";
  const postal =
    typeof snapshot.postalCode === "string" ? snapshot.postalCode : "";
  const parts = [line1, city, postal].filter(Boolean);
  return parts.join(", ") || "—";
}

function snapshotCoords(snapshot: Record<string, unknown>): {
  lat: number;
  lng: number;
} | null {
  const lat = snapshot.lat;
  const lng = snapshot.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    return { lat, lng };
  }
  return null;
}

function itemTitle(item: CourierOrderRow["items"][0]): string {
  const snap = item.productSnapshot;
  if (snap && typeof snap === "object" && "name" in snap) {
    const n = (snap as { name?: unknown }).name;
    if (typeof n === "string") return n;
  }
  return item.productId.slice(0, 8) + "…";
}

export function CourierOrderCard({
  order,
  onAdvance,
  disabled,
}: {
  order: CourierOrderRow;
  onAdvance: (id: string, next: CourierOrderRow["status"]) => void;
  disabled?: boolean;
}) {
  const next = getNextOrderStatus(order.status);
  const coords = snapshotCoords(order.deliverySnapshot);
  const mapsUrl =
    coords != null
      ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
      : null;

  return (
    <article
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
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

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <p className="text-xs font-medium uppercase text-neutral-500">
            Deliver to
          </p>
          <p className="mt-0.5 leading-snug">
            {snapshotAddress(order.deliverySnapshot)}
          </p>
        </div>
        {order.customer.phone ? (
          <a
            href={`tel:${order.customer.phone.replace(/\s/g, "")}`}
            className="inline-flex min-h-12 items-center text-base font-medium text-primary underline"
          >
            {order.customer.phone}
          </a>
        ) : (
          <p className="text-xs text-amber-700">No phone on file</p>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center text-base font-medium text-primary underline"
          >
            Open in Google Maps
          </a>
        )}
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3">
        <p className="text-xs font-medium uppercase text-neutral-500">Items</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="min-w-0 flex-1 truncate">
                {itemTitle(item)} × {item.quantity}
              </span>
              <span className="shrink-0 tabular-nums text-neutral-600">
                {formatMoney(item.unitPrice)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right text-base font-semibold tabular-nums">
          Total {formatMoney(order.totalPrice)}
        </p>
      </div>

      {next && (
        <div className="mt-5">
          <Button
            type="button"
            className="h-14 w-full rounded-xl text-base font-semibold"
            disabled={disabled}
            onClick={() => onAdvance(order.id, next)}
          >
            {courierActionLabelForNext(next)}
          </Button>
        </div>
      )}
    </article>
  );
}
