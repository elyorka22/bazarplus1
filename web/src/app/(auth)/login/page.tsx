import { LoginForm } from "./login-form";

function safeNextPath(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !v.startsWith("/") || v.startsWith("//")) {
    return "/";
  }
  return v;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  return <LoginForm defaultNext={safeNextPath(searchParams.next)} />;
}
