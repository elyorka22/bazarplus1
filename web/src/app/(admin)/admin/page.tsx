"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminStats } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const { data: d } = await api.get<AdminStats>("/admin/stats");
      return d;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading dashboard…</p>;
  }
  if (isError || !data) {
    return <p className="text-sm text-red-600">Failed to load stats.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Today’s numbers and live workload.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Orders today
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
            {data.ordersToday}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Revenue (paid today)
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-primary">
            {formatMoney(data.revenue)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase text-neutral-500">
            Active orders
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
            {data.activeOrders}
          </p>
          <p className="mt-1 text-xs text-neutral-500">Not delivered yet</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase text-neutral-500">
            All-time orders
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
            {data.allTimeOrderCount}
          </p>
        </Card>
      </div>
    </div>
  );
}
