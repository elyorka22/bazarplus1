import Link from "next/link";
import { uz } from "@/lib/i18n/uz";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[70vh] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          {uz.auth.backToStore}
        </Link>
        {children}
      </div>
    </div>
  );
}
