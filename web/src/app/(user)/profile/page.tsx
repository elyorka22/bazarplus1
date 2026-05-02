"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { api, parseApiError } from "@/lib/api";
import { uz } from "@/lib/i18n/uz";
import type { Address, User } from "@/lib/types";

const profileSchema = z.object({
  name: z.string().max(120).optional(),
  phone: z.string().max(32).optional(),
});

const addressSchema = z.object({
  label: z.string().max(80).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(32),
});

type ProfileForm = z.infer<typeof profileSchema>;
type AddressForm = z.infer<typeof addressSchema>;

export default function ProfilePage() {
  const { refetchUser, logout } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const userQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<User>("/users/me");
      return data;
    },
  });

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const { data } = await api.get<Address[]>("/users/me/addresses");
      return data;
    },
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    if (userQuery.data) {
      profileForm.reset({
        name: userQuery.data.name ?? "",
        phone: userQuery.data.phone ?? "",
      });
    }
  }, [userQuery.data, profileForm]);

  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      line1: "",
      city: "",
      postalCode: "",
    },
  });

  const saveProfile = useMutation({
    mutationFn: async (body: ProfileForm) => {
      await api.patch("/users/me", {
        name: body.name?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
      });
    },
    onSuccess: async () => {
      toast.success(uz.profile.updated);
      await qc.invalidateQueries({ queryKey: ["me"] });
      await refetchUser();
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  const addAddress = useMutation({
    mutationFn: async (body: AddressForm) => {
      await api.post("/users/me/addresses", {
        ...body,
        isDefault: (addressesQuery.data?.length ?? 0) === 0,
      });
    },
    onSuccess: async () => {
      toast.success(uz.profile.addressSaved);
      addressForm.reset({
        line1: "",
        line2: "",
        city: "",
        postalCode: "",
        label: "",
      });
      await qc.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e) => toast.error(parseApiError(e)),
  });

  if (userQuery.isLoading) {
    return <p className="text-sm text-neutral-500">{uz.profile.loading}</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-ink">{uz.profile.title}</h1>

      <Card className="p-4">
        <h2 className="font-semibold text-ink">{uz.profile.account}</h2>
        <p className="mt-1 text-sm text-neutral-500">{userQuery.data?.email}</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={profileForm.handleSubmit((v) => saveProfile.mutate(v))}
        >
          <div>
            <label className="text-sm font-medium">{uz.profile.name}</label>
            <Input className="mt-1" {...profileForm.register("name")} />
          </div>
          <div>
            <label className="text-sm font-medium">{uz.profile.phone}</label>
            <Input className="mt-1" {...profileForm.register("phone")} />
          </div>
          <Button type="submit" disabled={saveProfile.isPending}>
            {uz.profile.saveProfile}
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold text-ink">{uz.profile.addresses}</h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-700">
          {(addressesQuery.data ?? []).map((a) => (
            <li key={a.id} className="rounded-lg border border-neutral-100 p-3">
              {(a.label ? `${a.label} · ` : "") + a.line1}, {a.city}{" "}
              {a.postalCode}
            </li>
          ))}
          {(addressesQuery.data ?? []).length === 0 ? (
            <li className="text-neutral-500">{uz.profile.noAddresses}</li>
          ) : null}
        </ul>

        <h3 className="mt-6 text-sm font-semibold text-ink">
          {uz.profile.addAddressTitle}
        </h3>
        <form
          className="mt-3 space-y-3"
          onSubmit={addressForm.handleSubmit((v) => addAddress.mutate(v))}
        >
          <Input placeholder={uz.profile.labelPlaceholder} {...addressForm.register("label")} />
          <Input placeholder={uz.profile.line1Placeholder} {...addressForm.register("line1")} />
          <Input placeholder={uz.profile.line2Placeholder} {...addressForm.register("line2")} />
          <Input placeholder={uz.profile.cityPlaceholder} {...addressForm.register("city")} />
          <Input placeholder={uz.profile.postalPlaceholder} {...addressForm.register("postalCode")} />
          <Button type="submit" disabled={addAddress.isPending}>
            {uz.profile.addAddressBtn}
          </Button>
        </form>
      </Card>

      <Button
        variant="outline"
        type="button"
        className="w-full border-red-200 text-red-700 hover:bg-red-50"
        onClick={async () => {
          await logout();
          toast.success(uz.profile.signedOut);
          router.replace("/login");
        }}
      >
        {uz.profile.signOut}
      </Button>
    </div>
  );
}
