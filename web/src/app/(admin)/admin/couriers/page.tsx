"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import type { CourierRow } from "@/lib/types";

export default function AdminCouriersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "couriers", "available"],
    queryFn: async () => {
      const { data: d } = await api.get<CourierRow[]>("/courier/available");
      return d;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Couriers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Available couriers (assign from{" "}
        <Link href="/admin/orders" className="text-primary underline">
          Orders
        </Link>
        ).
      </p>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Available</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-neutral-500">
                  Loading…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-red-600">
                  Failed to load couriers.
                </td>
              </tr>
            )}
            {!isLoading &&
              data?.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {c.vehicle ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.isAvailable ? (
                      <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500">No</span>
                    )}
                  </td>
                </tr>
              ))}
            {!isLoading && data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-neutral-500">
                  No couriers marked available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
