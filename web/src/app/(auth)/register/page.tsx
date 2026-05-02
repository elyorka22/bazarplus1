"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  demoRegisterDefaults,
  isDemoDataEnabled,
} from "@/lib/demo-data";
import { parseApiError } from "@/lib/api";
import { uz } from "@/lib/i18n/uz";

const schema = z.object({
  name: z.string().max(120).optional(),
  email: z.string().email(),
  password: z.string().min(8, uz.validation.passwordMin8),
});

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: isDemoDataEnabled()
      ? {
          name: demoRegisterDefaults.name,
          email: demoRegisterDefaults.email,
          password: demoRegisterDefaults.password,
        }
      : undefined,
  });

  async function onSubmit(values: Form) {
    setErr(null);
    setBusy(true);
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        name: values.name,
      });
      router.replace("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{uz.auth.createTitle}</h1>
        <p className="mt-1 text-sm text-neutral-600">{uz.auth.createSubtitle}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-ink">{uz.auth.nameOptional}</label>
          <Input className="mt-1" {...form.register("name")} />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">{uz.auth.email}</label>
          <Input
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
          <label className="text-sm font-medium text-ink">{uz.auth.password}</label>
          <Input
            type="password"
            autoComplete="new-password"
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
          {busy ? uz.auth.creating : uz.auth.registerBtn}
        </Button>
      </form>
      <p className="text-center text-sm text-neutral-600">
        {uz.auth.hasAccount}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {uz.auth.signIn}
        </Link>
      </p>
    </div>
  );
}
