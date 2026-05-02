"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { api, extractOrderIdFromBody, parseApiError } from "@/lib/api";
import { uz } from "@/lib/i18n/uz";
import { formatMoney } from "@/lib/utils";
import type { Address } from "@/lib/types";

const checkoutSchema = z.object({
  addressId: z.string().uuid(uz.validation.selectAddress),
  paymentMethod: z.enum(["card", "cash", "wallet"]),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { lines, clear, subtotal } = useCart();
  const idempotencyKeyRef = useRef(uuidv4());
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data } = await api.get<Address[]>("/users/me/addresses");
      return data;
    },
  });

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: "card" },
  });

  async function onSubmit(values: CheckoutForm) {
    if (lines.length === 0) {
      toast.error(uz.checkout.cartEmptyToast);
      return;
    }
    if (busy || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      const { data } = await api.post(
        "/orders",
        {
          addressId: values.addressId,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
        },
        {
          headers: {
            "Idempotency-Key": idempotencyKeyRef.current,
          },
        },
      );
      const orderId = extractOrderIdFromBody(data);
      if (!orderId) {
        toast.error(uz.checkout.unexpectedToast, {
          description: uz.checkout.unexpectedDesc,
        });
        router.push("/orders");
        return;
      }
      clear();
      await qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(uz.checkout.successToast, {
        description: uz.checkout.successDesc,
      });
      router.push(`/orders/${orderId}`);
    } catch (e) {
      const msg = parseApiError(e);
      toast.error(uz.checkout.errorToast, { description: msg });
      if (/out of stock/i.test(msg)) {
        idempotencyKeyRef.current = uuidv4();
      }
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  if (lines.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-neutral-600">{uz.checkout.emptyTitle}</p>
        <Link
          href="/products"
          className="mt-4 inline-block font-medium text-primary hover:underline"
        >
          {uz.checkout.continueShopping}
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-ink">{uz.checkout.title}</h1>
      <Card className="p-4">
        <p className="text-sm text-neutral-600">{uz.checkout.summary}</p>
        <p className="mt-1 text-lg font-semibold text-primary">
          {formatMoney(subtotal)}
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          {uz.checkout.paymentNote}
        </p>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="text-sm font-medium text-ink">
            {uz.checkout.deliveryAddress}
          </label>
          {addresses.isLoading ? (
            <p className="mt-2 text-sm text-neutral-500">
              {uz.checkout.loadingAddresses}
            </p>
          ) : (addresses.data ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-red-600">
              {uz.checkout.addAddressHintBefore}{" "}
              <Link href="/profile" className="underline">
                {uz.checkout.addAddressHintProfile}
              </Link>{" "}
              {uz.checkout.addAddressHintAfter}
            </p>
          ) : (
            <select
              className="mt-2 w-full min-h-11 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              {...form.register("addressId")}
              defaultValue=""
            >
              <option value="" disabled>
                {uz.checkout.selectAddress}
              </option>
              {(addresses.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.label ? `${a.label} — ` : "") +
                    `${a.line1}, ${a.city}`}
                </option>
              ))}
            </select>
          )}
          {form.formState.errors.addressId ? (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.addressId.message}
            </p>
          ) : null}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink">
            {uz.checkout.paymentMethod}
          </legend>
          <div className="mt-2 space-y-2">
            {(
              [
                ["card", uz.checkout.payCard],
                ["wallet", uz.checkout.payWallet],
                ["cash", uz.checkout.payCash],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-100 p-3 hover:bg-neutral-50"
              >
                <input
                  type="radio"
                  value={value}
                  {...form.register("paymentMethod")}
                  className="text-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? uz.checkout.placing : uz.checkout.placeOrder}
        </Button>
      </form>
    </div>
  );
}
