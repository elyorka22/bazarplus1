import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full min-h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-ink outline-none ring-primary/30 placeholder:text-neutral-400 focus:border-primary focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
