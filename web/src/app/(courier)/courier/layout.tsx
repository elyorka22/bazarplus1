import type { Metadata } from "next";
import { CourierShell } from "@/components/courier/courier-shell";

export const metadata: Metadata = {
  title: "Courier | BazarPlus",
  robots: { index: false, follow: false },
};

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CourierShell>{children}</CourierShell>;
}
