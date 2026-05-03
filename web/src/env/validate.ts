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
 * Server Route Handlers: prefer SERVER_API_URL (e.g. http://api:3000 in Docker) so
 * fetches do not hit localhost inside the web container. Browser still uses NEXT_PUBLIC_API_URL.
 */
export function getServerApiUrlValidated(): string {
  const internalRaw = process.env.SERVER_API_URL?.trim();
  if (internalRaw) {
    const internal = urlSchema.safeParse(internalRaw);
    if (internal.success) {
      return internal.data;
    }
    const detail = internal.error.issues.map((i) => i.message).join("; ");
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[env] SERVER_API_URL invalid (${detail}), falling back to NEXT_PUBLIC_API_URL`,
      );
    } else {
      throw new Error(`SERVER_API_URL: ${detail}`);
    }
  }

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
