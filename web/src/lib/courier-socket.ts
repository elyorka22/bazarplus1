import { io, type Socket } from "socket.io-client";
import { getPublicApiUrl } from "@/lib/env";

/** Same flag as admin socket — disables realtime in Playwright / CI. */
export function isCourierSocketDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_SOCKET === "true";
}

function createNoopCourierSocket(): Socket {
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
 * Courier tracking namespace — matches API `WebSocketGateway` `/tracking`.
 */
export function createCourierTrackingSocket(accessToken: string): Socket {
  if (isCourierSocketDisabled()) {
    return createNoopCourierSocket();
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
