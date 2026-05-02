"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { Socket } from "socket.io-client";
import { Card } from "@/components/ui/card";
import { getAccessToken } from "@/lib/auth-tokens";
import { uz } from "@/lib/i18n/uz";
import { createTrackingSocket } from "@/lib/socket";
import type { OrderStatus } from "@/lib/types";

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
};

export function OrderTracking({ orderId, initialStatus }: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const orderIdRef = useRef(orderId);

  const labels = useMemo(
    () =>
      ({
        CREATED: uz.orderStatus.CREATED,
        ACCEPTED: uz.orderStatus.ACCEPTED,
        PREPARING: uz.orderStatus.PREPARING,
        ON_THE_WAY: uz.orderStatus.ON_THE_WAY,
        DELIVERED: uz.orderStatus.DELIVERED,
      }) satisfies Record<OrderStatus, string>,
    [],
  );

  const attachHandlers = useCallback((socket: Socket, oid: string) => {
    socket.off("order:status");
    socket.off("courier:location");

    socket.on(
      "order:status",
      (payload: { orderId: string; status: OrderStatus }) => {
        if (payload.orderId === oid) {
          setStatus(payload.status);
        }
      },
    );

    socket.on(
      "courier:location",
      (payload: { orderId: string; lat: number; lng: number }) => {
        if (payload.orderId === oid) {
          setLocation({ lat: payload.lat, lng: payload.lng });
        }
      },
    );
  }, []);

  const joinRoom = useCallback((socket: Socket, oid: string) => {
    socket.emit("join", { orderId: oid });
  }, []);

  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    function connect(accessToken: string) {
      if (cancelled) return;
      socketRef.current?.disconnect();
      const socket = createTrackingSocket(accessToken);
      socketRef.current = socket;

      const oid = orderIdRef.current;
      attachHandlers(socket, oid);

      const onReady = () => {
        joinRoom(socket, orderIdRef.current);
      };

      socket.on("connect", onReady);

      return socket;
    }

    const token = getAccessToken();
    if (!token) return;

    connect(token);

    function onTokenRefresh() {
      const t = getAccessToken();
      if (!t || cancelled) return;
      connect(t);
    }

    function onLogout() {
      socketRef.current?.disconnect();
      socketRef.current = null;
    }

    window.addEventListener("access-token-updated", onTokenRefresh);
    window.addEventListener("auth:logout", onLogout);

    return () => {
      cancelled = true;
      window.removeEventListener("access-token-updated", onTokenRefresh);
      window.removeEventListener("auth:logout", onLogout);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [orderId, attachHandlers, joinRoom]);

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ink">{uz.tracking.title}</p>
      <p className="mt-2 text-lg font-medium text-primary">
        {labels[status] ?? status}
      </p>
      {location ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
          <MapPin className="h-4 w-4 text-primary" />
          {uz.tracking.courierAt(
            location.lat.toFixed(4),
            location.lng.toFixed(4),
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">
          {uz.tracking.courierPending}
        </p>
      )}
    </Card>
  );
}
