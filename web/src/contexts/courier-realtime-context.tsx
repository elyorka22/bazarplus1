"use client";

import { createContext, useContext } from "react";
import { useCourierRealtime } from "@/hooks/use-courier-realtime";

type CourierRealtimeContextValue = ReturnType<typeof useCourierRealtime>;

const CourierRealtimeContext =
  createContext<CourierRealtimeContextValue | null>(null);

export function CourierRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useCourierRealtime();
  return (
    <CourierRealtimeContext.Provider value={value}>
      {children}
    </CourierRealtimeContext.Provider>
  );
}

export function useCourierRealtimeEmit(): CourierRealtimeContextValue {
  const ctx = useContext(CourierRealtimeContext);
  if (!ctx) {
    throw new Error("CourierRealtimeProvider required");
  }
  return ctx;
}
