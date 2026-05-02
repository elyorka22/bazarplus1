import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  disabled,
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-primary text-white shadow-soft hover:bg-primary-dark",
        variant === "outline" &&
          "border border-neutral-200 bg-white text-ink hover:bg-neutral-50",
        variant === "ghost" && "text-ink hover:bg-neutral-100",
        size === "sm" && "min-h-10 px-3 text-sm",
        size === "md" && "min-h-11 px-4 text-sm",
        size === "lg" && "min-h-12 px-6 text-base",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
