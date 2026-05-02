"use client";

import { useQuery } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { ORDER_STATUS_LABEL } from "@/lib/admin/order-status";
import type {
  AdminCourierMapEntry,
  AdminLiveCourierBootstrap,
} from "@/lib/admin-courier-map-types";
import { api } from "@/lib/api";
import {
  COURIER_MAP_STALE_MS,
  entryOnline,
  useAdminCourierMap,
} from "@/hooks/use-admin-courier-map";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER: [number, number] = [45.5017, -73.5673];

function FitBounds({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled) return;
      const b = L.latLngBounds(points);
      map.fitBounds(b, { padding: [48, 48], maxZoom: 15 });
    });
    return () => {
      cancelled = true;
    };
  }, [map, points]);

  return null;
}

function FlyToCourier({
  courierId,
  lat,
  lng,
}: {
  courierId: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!courierId || lat == null || lng == null) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [courierId, lat, lng, map]);

  return null;
}

function MapInner({
  couriers,
  selectedId,
  flyLat,
  flyLng,
}: {
  couriers: Record<string, AdminCourierMapEntry>;
  selectedId: string | null;
  flyLat: number | null;
  flyLng: number | null;
}) {
  const points = useMemo(() => {
    const out: [number, number][] = [];
    for (const c of Object.values(couriers)) {
      if (c.lat != null && c.lng != null) {
        out.push([c.lat, c.lng]);
      }
    }
    return out;
  }, [couriers]);

  const center = points[0] ?? DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="z-0 h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      <FlyToCourier
        courierId={selectedId}
        lat={flyLat}
        lng={flyLng}
      />
      {Object.values(couriers).map((c) => {
        if (c.lat == null || c.lng == null) return null;
        const online = entryOnline(c);
        return (
          <CircleMarker
            key={c.courierId}
            center={[c.lat, c.lng]}
            radius={11}
            pathOptions={{
              color: online ? "#2563eb" : "#9ca3af",
              fillColor: online ? "#3b82f6" : "#d1d5db",
              fillOpacity: online ? 0.85 : 0.65,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[160px] text-sm">
                <p className="font-semibold text-ink">{c.name}</p>
                {c.orderId && (
                  <p className="mt-1 font-mono text-xs text-neutral-600">
                    Order #{c.orderId.slice(0, 8)}…
                  </p>
                )}
                <p className="mt-1 text-xs text-neutral-600">
                  {c.status
                    ? ORDER_STATUS_LABEL[c.status]
                    : "No active order"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {online ? "Live" : "Stale / offline"}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default function AdminCourierMapPage() {
  const { data: bootstrap } = useQuery({
    queryKey: ["admin", "couriers", "live"],
    queryFn: async () => {
      const { data } = await api.get<AdminLiveCourierBootstrap[]>(
        "/admin/couriers/live",
      );
      return data;
    },
    refetchInterval: 60_000,
  });

  const { couriers, list } = useAdminCourierMap(bootstrap);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? couriers[selectedId] : null;

  const onSelectCourier = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const flyLat = selected?.lat ?? null;
  const flyLng = selected?.lng ?? null;

  return (
    <div className="relative -mx-6 -mt-8 flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between px-6 pb-3 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-ink">Live map</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Courier GPS (throttled ~3s) · Grey when no fix for{" "}
            {Math.round(COURIER_MAP_STALE_MS / 1000)}s
          </p>
        </div>
      </div>

      <div className="relative min-h-[560px] flex-1 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-inner">
        <MapInner
          couriers={couriers}
          selectedId={selectedId}
          flyLat={flyLat}
          flyLng={flyLng}
        />

        <aside
          className={cn(
            "absolute bottom-4 left-4 top-4 z-[500] flex w-[min(100%,280px)] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white/95 shadow-lg backdrop-blur",
            "max-md:right-4 max-md:left-4 max-md:top-auto max-md:w-auto max-md:max-h-[40vh]",
          )}
        >
          <div className="border-b border-neutral-100 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Active couriers
            </p>
            <p className="text-sm text-neutral-600">{list.length} on roster</p>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {list.length === 0 && (
              <li className="px-2 py-4 text-center text-sm text-neutral-500">
                No couriers in database.
              </li>
            )}
            {list.map((c) => {
              const online = entryOnline(c);
              const hasPos = c.lat != null && c.lng != null;
              return (
                <li key={c.courierId}>
                  <button
                    type="button"
                    disabled={!hasPos}
                    onClick={() => onSelectCourier(c.courierId)}
                    className={cn(
                      "mb-1 w-full rounded-lg px-3 py-3 text-left text-sm transition",
                      selectedId === c.courierId
                        ? "bg-primary/15 ring-1 ring-primary/30"
                        : "hover:bg-neutral-50",
                      !hasPos && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span
                        className={cn(
                          "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                          online ? "bg-blue-500" : "bg-neutral-400",
                        )}
                        aria-hidden
                      />
                      {c.name}
                    </span>
                    {c.orderId && (
                      <p className="mt-1 font-mono text-xs text-neutral-500">
                        #{c.orderId.slice(0, 8)}… ·{" "}
                        {c.status
                          ? ORDER_STATUS_LABEL[c.status]
                          : "—"}
                      </p>
                    )}
                    {!hasPos && (
                      <p className="mt-1 text-xs text-amber-700">No GPS yet</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
