/**
 * Socket.IO / Engine.IO CORS must mirror HTTP CORS — never use `origin: '*'`
 * with authenticated connections in production.
 */
export function buildSocketIoCors(): {
  origin: boolean | string | string[];
  credentials: boolean;
} {
  const raw = process.env.CORS_ORIGINS ?? "";
  const origins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const prod = process.env.NODE_ENV === "production";

  return {
    origin:
      origins.length > 0 ? origins : prod ? false : true,
    credentials: true,
  };
}
