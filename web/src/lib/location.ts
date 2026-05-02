/** Skip browser geolocation in tests / CI (Playwright). */
export function isGeolocationDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_GEOLOCATION === "true";
}

export type GeoWatcherHandle = {
  stop: () => void;
};

/**
 * Watch position and invoke `onCoords` at most every `intervalMs` while active.
 * Caller decides when to start/stop (e.g. only while ON_THE_WAY).
 */
export function watchCourierLocation(options: {
  intervalMs: number;
  onCoords: (lat: number, lng: number) => void;
  onPermissionDenied?: () => void;
  onError?: (message: string) => void;
}): GeoWatcherHandle {
  if (typeof navigator === "undefined" || isGeolocationDisabled()) {
    return { stop: () => {} };
  }

  const geo = navigator.geolocation;
  if (!geo) {
    options.onError?.("Geolocation not supported");
    return { stop: () => {} };
  }

  let lastEmit = 0;
  let watchId: number | undefined;

  watchId = geo.watchPosition(
    (pos) => {
      const now = Date.now();
      if (now - lastEmit < options.intervalMs) return;
      lastEmit = now;
      options.onCoords(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        options.onPermissionDenied?.();
      } else {
        options.onError?.(err.message || "Location error");
      }
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
  );

  return {
    stop() {
      if (watchId !== undefined) {
        geo.clearWatch(watchId);
        watchId = undefined;
      }
    },
  };
}
