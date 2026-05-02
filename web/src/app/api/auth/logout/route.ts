import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearRefreshCookieAttributes } from "@/lib/auth-cookie";
import { serverApiUrl } from "@/lib/server-api-url";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const cookieStore = cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (auth) {
    await fetch(`${serverApiUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        refreshToken ? { refreshToken } : {},
      ),
    }).catch(() => undefined);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("refresh_token", "", clearRefreshCookieAttributes());
  return res;
}
