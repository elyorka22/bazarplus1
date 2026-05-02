import { NextResponse } from "next/server";
import { refreshCookieAttributes } from "@/lib/auth-cookie";
import { serverApiUrl } from "@/lib/server-api-url";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  if (!email || !password) {
    return NextResponse.json(
      { error: { message: "Email and password required" } },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${serverApiUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
