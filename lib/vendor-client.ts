"use client";

// Calling the vendor API from the portal screens, sending back to the portal
// sign-in if the session has ended. Mirrors lib/admin-client's adminApi.

export interface ApiResult {
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export async function vendorApi(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown): Promise<ApiResult> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 || res.status === 403) {
    window.location.assign("/portal/login");
  }
  return { ok: res.ok && data?.ok !== false, status: res.status, data };
}
