import { getServerApiUrlValidated } from "@/env/validate";

export function serverApiUrl(): string {
  return getServerApiUrlValidated();
}
