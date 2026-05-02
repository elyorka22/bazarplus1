import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearRefreshCookieAttributes,
  refreshCookieAttributes,
} from "@/lib/auth-cookie";
import { serverApiUrl } from "@/lib/server-api-url";

export async function POST() {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { error: { message: "No refresh session" } },
      { status: 401 },
    );
  }

  const upstream = await fetch(`${serverApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const res = NextResponse.json(data, { status: upstream.status });
    res.cookies.set("refresh_token", "", clearRefreshCookieAttributes());
    return res;
  }

  const newRefresh = data.refreshToken as string | undefined;
  const accessToken = data.accessToken as string | undefined;
  const expiresIn = data.expiresIn;

  const res = NextResponse.json({ accessToken, expiresIn });

  if (newRefresh) {
    res.cookies.set("refresh_token", newRefresh, refreshCookieAttributes());
  }

  return res;
}
