"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth-tokens";
import {
  createCourierTrackingSocket,
  isCourierSocketDisabled,
} from "@/lib/courier-socket";

export function useCourierRealtime() {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const invalidateCourierOrders = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["courier", "orders"] });
  }, [qc]);

  const connect = useCallback(() => {
    if (isCourierSocketDisabled()) {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    const token = getAccessToken();
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    const socket = createCourierTrackingSocket(token);
    socketRef.current = socket;

    socket.on("order:assigned", () => {
      invalidateCourierOrders();
    });
    socket.on("order:status.updated", () => {
      invalidateCourierOrders();
    });
  }, [invalidateCourierOrders]);

  useEffect(() => {
    connect();
    const onToken = () => connect();
    const onLogout = () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
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

  /**
   * Emit live GPS — backend mirrors REST PATCH /courier/me/location.
   */
  const emitLocation = useCallback((lat: number, lng: number) => {
    const s = socketRef.current;
    if (!s || isCourierSocketDisabled()) return;
    s.emit("courier:location.update", { lat, lng });
  }, []);

  return { emitLocation };
}
