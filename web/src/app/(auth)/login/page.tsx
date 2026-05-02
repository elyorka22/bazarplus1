import { Suspense } from "react";
import { uz } from "@/lib/i18n/uz";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <p className="mt-8 text-sm text-neutral-500">{uz.auth.loading}</p>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
