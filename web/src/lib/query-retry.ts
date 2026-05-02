import { isAxiosError } from "axios";

export function isNonRetryableClientError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const s = error.response?.status;
  return s !== undefined && s >= 400 && s < 500;
}

export function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  if (isNonRetryableClientError(error)) return false;
  return failureCount < 2;
}

export function defaultMutationRetry(
  failureCount: number,
  error: unknown,
): boolean {
  if (isNonRetryableClientError(error)) return false;
  return failureCount < 1;
}

export function isNetworkError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return !error.response;
}
