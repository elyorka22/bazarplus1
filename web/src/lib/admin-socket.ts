import { io, type Socket } from "socket.io-client";
import { getPublicApiUrl } from "@/lib/env";

/** When true (e.g. Playwright), skip Socket.IO entirely — no realtime in tests. */
export function isAdminSocketDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_SOCKET === "true";
}

function createNoopAdminSocket(): Socket {
  const chain = function noopChain(this: unknown) {
    return this;
  };
  const noop = () => {};
  const mockIo = {
    on: chain,
    off: chain,
    close: noop,
    engine: { on: chain },
  };
  return {
    connect: noop,
    disconnect: noop,
    emit: noop,
    send: noop,
    off: chain,
    on: chain,
    once: chain,
    removeAllListeners: noop,
    io: mockIo as unknown as Socket["io"],
  } as unknown as Socket;
}

/**
 * Admin tracking namespace (must match API `WebSocketGateway` path `/tracking`).
 * Auth: JWT access token in handshake (same as customer tracking).
 */
export function createAdminTrackingSocket(accessToken: string): Socket {
  if (isAdminSocketDisabled()) {
    return createNoopAdminSocket();
  }
  const base = getPublicApiUrl();
  return io(`${base}/tracking`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.5,
  });
}

export type AdminConnectionState =
  | "connected"
  | "disconnected"
  | "reconnecting";

/** Optional one-shot beep for new orders (fails silently if blocked). */
export function playNewOrderChime(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.start();
    o.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore
  }
}
