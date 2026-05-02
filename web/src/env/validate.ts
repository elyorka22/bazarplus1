import { z } from "zod";

const urlSchema = z
  .string()
  .min(1)
  .superRefine((val, ctx) => {
    try {
      new URL(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a valid absolute URL (e.g. https://api.example.com)",
      });
    }
  })
  .transform((s) => s.replace(/\/$/, ""));

/**
 * Safe on client: validates inlined NEXT_PUBLIC_* only (no secrets).
 */
export function getPublicApiUrlValidated(): string {
  const fallback = "http://localhost:3000";
  const raw = process.env.NEXT_PUBLIC_API_URL ?? fallback;
  const parsed = urlSchema.safeParse(raw);
  if (!parsed.success) {
    if (typeof window !== "undefined") {
      console.warn("[env] NEXT_PUBLIC_API_URL invalid, using fallback", raw);
    }
    return fallback;
  }
  return parsed.data;
}

/**
 * Server Route Handlers: fail fast on misconfiguration (except explicit fallback in dev).
 */
export function getServerApiUrlValidated(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const parsed = urlSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[env] NEXT_PUBLIC_API_URL invalid (${detail}), using fallback`);
      return "http://localhost:3000";
    }
    throw new Error(`[env] NEXT_PUBLIC_API_URL: ${detail}`);
  }
  return parsed.data;
}
