import { io, type Socket } from "socket.io-client";
import { getPublicApiUrl } from "@/lib/env";

export function createTrackingSocket(accessToken: string): Socket {
  const base = getPublicApiUrl();
  return io(`${base}/tracking`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  });
}
