import { getPublicApiUrlValidated } from "@/env/validate";

export function getPublicApiUrl(): string {
  return getPublicApiUrlValidated();
}
