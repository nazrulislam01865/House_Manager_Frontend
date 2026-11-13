"use client";
let csrf = "";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export async function api<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const method = options.method || "GET";
  if (!["GET", "HEAD"].includes(method) && !path.includes("/login") && !csrf) {
    const r = await fetch("/api/v1/auth/csrf", {
      credentials: "include",
      cache: "no-store",
    });
    if (!r.ok) throw new ApiError("Sign in to continue", r.status);
    csrf = (await r.json()).csrf;
  }
  const response = await fetch("/api/v1" + path, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (
    response.status === 403 &&
    data.error?.message === "Invalid CSRF token" &&
    !retried
  ) {
    csrf = "";
    return api<T>(path, options, true);
  }
  if (response.status === 401 && typeof window !== "undefined")
    window.dispatchEvent(new Event("houseledger:session-expired"));
  if (!response.ok)
    throw new ApiError(
      data.error?.message || data.message || "The request failed",
      response.status,
      data.error?.fieldErrors,
    );
  if (data.csrf) csrf = data.csrf;
  return data;
}
export const write = <T = Record<string, unknown>>(
  path: string,
  body: unknown,
  method = "POST",
  key?: string,
) =>
  api<T>(path, {
    method,
    body: JSON.stringify(body),
    headers: key ? { "Idempotency-Key": key } : {},
  });
export function toMinor(value: string): string {
  const v = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(v))
    throw Error("Enter an amount with at most two decimal places");
  const [whole, cents = ""] = v.split(".");
  return (
    BigInt(whole) * BigInt(100) +
    BigInt(cents.padEnd(2, "0"))
  ).toString();
}
export function money(minor: string | number = "0") {
  const n = BigInt(minor),
    negative = n < BigInt(0),
    v = negative ? -n : n;
  const fraction = (v % BigInt(100)).toString().padStart(2, "0");
  return (
    "BDT " +
    (negative ? "-" : "") +
    (v / BigInt(100)).toLocaleString("en-GB") +
    (fraction === "00" ? "" : "." + fraction)
  );
}
export function major(minor: string = "0") {
  const n = BigInt(minor);
  return (
    (n / BigInt(100)).toString() +
    "." +
    (n % BigInt(100)).toString().padStart(2, "0")
  );
}
export const currentMonth = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date());
export const currentDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date());
export async function financialWrite<T = Record<string, unknown>>(
  path: string,
  body: unknown,
): Promise<T> {
  const signature = JSON.stringify([path, body]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(signature),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const storageKey = "houseledger.pending:" + fingerprint;
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
  }
  const result = await write<T>(path, body, "POST", key);
  sessionStorage.removeItem(storageKey);
  return result;
}
