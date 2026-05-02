import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUS_LABEL } from "@/lib/admin/order-status";

/**
 * Short action labels for the courier primary button (matches pipeline steps).
 */
export function courierActionLabelForNext(next: OrderStatus): string {
  switch (next) {
    case "PREPARING":
      return "Accept";
    case "ON_THE_WAY":
      return "Start";
    case "DELIVERED":
      return "Complete";
    default:
      return `→ ${ORDER_STATUS_LABEL[next]}`;
  }
}
