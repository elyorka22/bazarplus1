import { setAccessToken } from "@/lib/auth-tokens";

export async function loginWithPassword(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: { message?: string } }).error?.message ??
      "Login failed";
    throw new Error(msg);
  }
  const body = data as { accessToken?: string };
  if (body.accessToken) {
    setAccessToken(body.accessToken);
  }
  return body;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  name?: string;
}) {
  console.log("REGISTER ACCOUNT CALLED", input);
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  console.log("REGISTER ACCOUNT RESPONSE", { status: res.status, data });
  if (!res.ok) {
    const msg =
      (data as { error?: { message?: string } }).error?.message ??
      "Registration failed";
    throw new Error(msg);
  }
  const body = data as { accessToken?: string };
  if (body.accessToken) {
    setAccessToken(body.accessToken);
  }
  return body;
}

export async function bootstrapSession(): Promise<boolean> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { accessToken?: string };
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    return true;
  }
  return false;
}

export async function logoutRequest(accessToken: string | null) {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  });
}
