import type { OrderStatus } from "@/lib/types";

export type AdminLiveCourierBootstrap = {
  courierId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  orderId: string | null;
  status: OrderStatus | null;
};

export type AdminCourierMapEntry = {
  courierId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  orderId: string | null;
  status: OrderStatus | null;
  /** Last GPS fix or meaningful assign event (ms). */
  lastSeen: number;
};
