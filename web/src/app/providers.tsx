"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { toast, Toaster } from "sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import {
  defaultMutationRetry,
  defaultQueryRetry,
  isNetworkError,
} from "@/lib/query-retry";
import { uz } from "@/lib/i18n/uz";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              const ok = defaultQueryRetry(failureCount, error);
              if (
                ok &&
                isNetworkError(error) &&
                failureCount === 0 &&
                typeof window !== "undefined"
              ) {
                toast.message(uz.connectionToast.title, {
                  description: uz.connectionToast.retrying,
                });
              }
              return ok;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: defaultMutationRetry,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <CartProvider>
          {children}
          <Toaster richColors position="top-center" />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
