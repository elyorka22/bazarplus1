"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AdminUserRow, Paginated } from "@/lib/types";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      const { data: d } = await api.get<Paginated<AdminUserRow>>(
        `/admin/users?${params}`,
      );
      return d;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Users</h1>
      <p className="mt-1 text-sm text-neutral-500">Accounts registered in the platform.</p>

      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
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
            {!isLoading &&
              data?.items.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === "ADMIN"
                          ? "rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                          : "rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700"
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-neutral-600">
            Page {data.meta.page} / {data.meta.totalPages}
          </span>
          <button
            type="button"
            className="rounded border border-neutral-300 px-3 py-1 disabled:opacity-40"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
