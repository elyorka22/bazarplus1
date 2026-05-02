"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth-tokens";
import {
  createAdminTrackingSocket,
  isAdminSocketDisabled,
} from "@/lib/admin-socket";
import type {
  AdminCourierMapEntry,
  AdminLiveCourierBootstrap,
} from "@/lib/admin-courier-map-types";
import type { OrderStatus } from "@/lib/types";

const LOCATION_FLUSH_MS = 3000;
export const COURIER_MAP_STALE_MS = 90_000;

export function entryOnline(e: AdminCourierMapEntry): boolean {
  if (e.lat == null || e.lng == null) return false;
  return Date.now() - e.lastSeen < COURIER_MAP_STALE_MS;
}

export function useAdminCourierMap(
  bootstrap: AdminLiveCourierBootstrap[] | undefined,
) {
  const draftRef = useRef<Record<string, AdminCourierMapEntry>>({});
  const [couriers, setCouriers] = useState<Record<string, AdminCourierMapEntry>>(
    {},
  );

  const patchDraft = useCallback(
    (courierId: string, patch: Partial<AdminCourierMapEntry>) => {
      const prev = draftRef.current[courierId];
      draftRef.current[courierId] = {
        courierId,
        name: patch.name ?? prev?.name ?? "Courier",
        lat: patch.lat !== undefined ? patch.lat : (prev?.lat ?? null),
        lng: patch.lng !== undefined ? patch.lng : (prev?.lng ?? null),
        orderId:
          patch.orderId !== undefined ? patch.orderId : (prev?.orderId ?? null),
        status:
          patch.status !== undefined ? patch.status : (prev?.status ?? null),
        lastSeen: patch.lastSeen ?? prev?.lastSeen ?? 0,
      };
    },
    [],
  );

  const flush = useCallback(() => {
    setCouriers({ ...draftRef.current });
  }, []);

  useEffect(() => {
    if (!bootstrap?.length) return;
    const now = Date.now();
    for (const row of bootstrap) {
      draftRef.current[row.courierId] = {
        courierId: row.courierId,
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        orderId: row.orderId,
        status: row.status,
        lastSeen:
          row.lat != null && row.lng != null ? now : row.orderId ? now : 0,
      };
    }
    flush();
  }, [bootstrap, flush]);

  useEffect(() => {
    const id = window.setInterval(flush, LOCATION_FLUSH_MS);
    return () => window.clearInterval(id);
  }, [flush]);

  const socketRef = useRef<Socket | null>(null);

  const connectSocket = useCallback(() => {
    if (isAdminSocketDisabled()) {
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

    const socket = createAdminTrackingSocket(token);
    socketRef.current = socket;

    socket.on(
      "courier:location.updated",
      (payload: {
        orderId: string;
        courierId: string;
        lat: number;
        lng: number;
      }) => {
        patchDraft(payload.courierId, {
          lat: payload.lat,
          lng: payload.lng,
          orderId: payload.orderId,
          lastSeen: Date.now(),
        });
      },
    );

    socket.on(
      "courier:assigned",
      (body: {
        orderId: string;
        courier: { id: string; name: string };
      }) => {
        patchDraft(body.courier.id, {
          name: body.courier.name,
          orderId: body.orderId,
          lastSeen: Date.now(),
        });
        flush();
      },
    );

    socket.on(
      "order:status.updated",
      (body: { orderId: string; status: OrderStatus }) => {
        for (const id of Object.keys(draftRef.current)) {
          const c = draftRef.current[id];
          if (c?.orderId === body.orderId) {
            patchDraft(id, { status: body.status, lastSeen: Date.now() });
          }
        }
        flush();
      },
    );
  }, [patchDraft, flush]);

  useEffect(() => {
    connectSocket();
    const onToken = () => connectSocket();
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
  }, [connectSocket]);

  const list = Object.values(couriers).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return { couriers, list };
}
