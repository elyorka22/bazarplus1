"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth-tokens";
import {
  patchOrderInAllCachedLists,
  prependOrderOnFirstPage,
  matchesStatusFilter,
} from "@/lib/admin-orders-cache";
import {
  createAdminTrackingSocket,
  isAdminSocketDisabled,
  playNewOrderChime,
  type AdminConnectionState,
} from "@/lib/admin-socket";
import type { AdminOrderListItem, OrderStatus } from "@/lib/types";

type RealtimeOptions = {
  statusFilter: OrderStatus | "";
  page: number;
  enableSound?: boolean;
};

export function useAdminOrdersRealtime({
  statusFilter,
  page,
  enableSound = true,
}: RealtimeOptions) {
  const qc = useQueryClient();
  const [connection, setConnection] = useState<AdminConnectionState>(
    "disconnected",
  );
  const [newOrderBadge, setNewOrderBadge] = useState(0);
  const [flashOrderIds, setFlashOrderIds] = useState<Set<string>>(() => new Set());
  const [statusFlashIds, setStatusFlashIds] = useState<Set<string>>(
    () => new Set(),
  );

  const socketRef = useRef<Socket | null>(null);
  const pageRef = useRef(page);
  const filterRef = useRef(statusFilter);
  pageRef.current = page;
  filterRef.current = statusFilter;

  const flashRow = useCallback((id: string) => {
    setFlashOrderIds((s) => new Set(s).add(id));
    window.setTimeout(() => {
      setFlashOrderIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 2500);
  }, []);

  const flashStatus = useCallback((id: string) => {
    setStatusFlashIds((s) => new Set(s).add(id));
    window.setTimeout(() => {
      setStatusFlashIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, 800);
  }, []);

  const connect = useCallback(() => {
    if (isAdminSocketDisabled()) {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnection("disconnected");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      socketRef.current?.disconnect();
      setConnection("disconnected");
      return;
    }
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    const socket = createAdminTrackingSocket(token);
    socketRef.current = socket;

    const onConnect = () => setConnection("connected");
    const onDisconnect = () => setConnection("disconnected");
    const onReconnectAttempt = () => setConnection("reconnecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);

    socket.on(
      "order:created",
      (order: AdminOrderListItem) => {
        prependOrderOnFirstPage(qc, order);
        if (pageRef.current === 1 && matchesStatusFilter(filterRef.current, order.status)) {
          flashRow(order.id);
        }
        setNewOrderBadge((c) => c + 1);
        toast.success("New order received", { description: order.id.slice(0, 8) + "…" });
        if (enableSound) playNewOrderChime();
        void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      },
    );

    socket.on(
      "order:status.updated",
      (body: { orderId: string; status: OrderStatus }) => {
        patchOrderInAllCachedLists(qc, body.orderId, { status: body.status });
        flashStatus(body.orderId);
        void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      },
    );

    socket.on(
      "courier:assigned",
      (body: {
        orderId: string;
        courier: { id: string; name: string };
      }) => {
        patchOrderInAllCachedLists(qc, body.orderId, {
          courier: { id: body.courier.id, name: body.courier.name },
        });
        flashStatus(body.orderId);
      },
    );

    socket.on("courier:location.updated", () => {
      // Optional: no list row change; couriers page can refetch if open
    });
  }, [qc, enableSound, flashRow, flashStatus]);

  useEffect(() => {
    connect();
    const onToken = () => connect();
    const onLogout = () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnection("disconnected");
    };
    window.addEventListener("access-token-updated", onToken);
    window.addEventListener("auth:logout", onLogout);
    return () => {
      window.removeEventListener("access-token-updated", onToken);
      window.removeEventListener("auth:logout", onLogout);
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  const clearNewBadge = useCallback(() => setNewOrderBadge(0), []);

  return {
    connection,
    newOrderBadge,
    clearNewBadge,
    flashOrderIds,
    statusFlashIds,
  };
}
