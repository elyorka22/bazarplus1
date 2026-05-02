import { NextResponse } from "next/server";
import { refreshCookieAttributes } from "@/lib/auth-cookie";
import { serverApiUrl } from "@/lib/server-api-url";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: { message: "Email and password required" } },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${serverApiUrl()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const accessToken = data.accessToken as string | undefined;
  const refreshToken = data.refreshToken as string | undefined;
  const expiresIn = data.expiresIn;

  const res = NextResponse.json({ accessToken, expiresIn });

  if (refreshToken) {
    res.cookies.set("refresh_token", refreshToken, refreshCookieAttributes());
  }

  return res;
}
