type SameSite = "lax" | "strict" | "none";

function parseSameSite(): SameSite {
  const raw = process.env.AUTH_COOKIE_SAMESITE?.toLowerCase();
  if (raw === "none" || raw === "strict" || raw === "lax") {
    return raw;
  }
  return "lax";
}

/**
 * Refresh token cookie options for NextResponse.cookies.set.
 * For production on `app.domain.com` with API on `api.domain.com`, set:
 *   AUTH_COOKIE_SAMESITE=none
 *   AUTH_COOKIE_DOMAIN=.domain.com
 * so the cookie is available to all subdomains (https + secure required for none).
 */
export function refreshCookieAttributes(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSite;
  path: string;
  maxAge: number;
  domain?: string;
} {
  const sameSite = parseSameSite();
  const isProd = process.env.NODE_ENV === "production";
  const secure = sameSite === "none" ? true : isProd;
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    ...(domain ? { domain } : {}),
  };
}

export function clearRefreshCookieAttributes(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSite;
  path: string;
  maxAge: number;
} {
  return {
    ...refreshCookieAttributes(),
    maxAge: 0,
  };
}
