"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { demoAuthCredentials, isDemoDataEnabled } from "@/lib/demo-data";
import { parseApiError } from "@/lib/api";
import { uz } from "@/lib/i18n/uz";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, uz.validation.required),
});

type Form = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: isDemoDataEnabled()
      ? {
          email: demoAuthCredentials.email,
          password: demoAuthCredentials.password,
        }
      : undefined,
  });

  async function onSubmit(values: Form) {
    setErr(null);
    setBusy(true);
    try {
      await login(values.email, values.password);
      const next = searchParams.get("next") ?? "/";
      router.replace(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{uz.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-neutral-600">{uz.auth.loginSubtitle}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-ink">
            {uz.auth.email}
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            className="mt-1"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="text-sm font-medium text-ink"
          >
            {uz.auth.password}
          </label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="mt-1"
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? uz.auth.signingIn : uz.auth.signIn}
        </Button>
      </form>
      <p className="text-center text-sm text-neutral-600">
        {uz.auth.noAccount}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {uz.auth.register}
        </Link>
      </p>
    </div>
  );
}
