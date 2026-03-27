import type { RFQ, Vendor, Quote, AgentRun, ApiResponse, DiscoveryRun, ShippingDetails } from "../types";

const BASE = "/api";

async function req<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = (await res.json()) as ApiResponse<T>;
  if (!res.ok || data.status === "error") {
    throw new Error((data as { message?: string }).message ?? "Request failed");
  }
  return data;
}

// ─── RFQ ──────────────────────────────────────────────────────────────────────

export const rfqApi = {
  list: (page = 1, limit = 20) =>
    req<RFQ[]>(`/rfq?page=${page}&limit=${limit}`),

  get: (id: string) => req<RFQ>(`/rfq/${id}`),

  create: (body: Omit<RFQ, "_id" | "status" | "createdAt" | "updatedAt" | "quotes"> & { shippingDetails?: ShippingDetails }) =>
    req<RFQ>("/rfq", { method: "POST", body: JSON.stringify(body) }),

  run: (id: string, vendorIds?: string[]) =>
    req<{ rfqId: string; status: string }>(`/rfq/${id}/run`, {
      method: "POST",
      body: JSON.stringify(vendorIds ? { vendorIds } : {}),
    }),

  cancel: (id: string) =>
    req<null>(`/rfq/${id}/cancel`, { method: "POST" }),

  award: (id: string, awardedVendorId: string, awardNotes?: string) =>
    req<null>(`/rfq/${id}/award`, { method: "PATCH", body: JSON.stringify({ awardedVendorId, awardNotes }) }),

  delete: (id: string) => req<null>(`/rfq/${id}`, { method: "DELETE" }),
};

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendorApi = {
  list: (tag?: string) =>
    req<Vendor[]>(`/vendors${tag ? `?tag=${tag}` : ""}`),

  get: (id: string) => req<Vendor>(`/vendors/${id}`),

  create: (body: Omit<Vendor, "_id" | "reliability" | "avgSteps" | "createdAt" | "updatedAt">) =>
    req<Vendor>("/vendors", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<Vendor>) =>
    req<Vendor>(`/vendors/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  delete: (id: string) => req<null>(`/vendors/${id}`, { method: "DELETE" }),

  checkTrust: (id: string) =>
    req<{ vendorId: string }>(`/vendors/${id}/check-trust`, { method: "POST" }),
};

// ─── Agent ────────────────────────────────────────────────────────────────────

export const agentApi = {
  getRuns: (rfqId: string) => req<AgentRun[]>(`/agent/runs/${rfqId}`),
  cancel: (runId: string) =>
    req<null>(`/agent/cancel/${runId}`, { method: "POST" }),
};

// ─── Discovery ────────────────────────────────────────────────────────────────

export const discoveryApi = {
  search: (keyword: string, sources: string[] = ["google"]) =>
    req<DiscoveryRun[]>("/discovery/search", {
      method: "POST",
      body: JSON.stringify({ keyword, sources }),
    }),

  listRuns: () => req<DiscoveryRun[]>("/discovery/runs"),

  getRun: (id: string) => req<DiscoveryRun>(`/discovery/runs/${id}`),

  accept: (discoveryRunId: string, vendorIndex: number) =>
    req<Vendor>("/discovery/accept", {
      method: "POST",
      body: JSON.stringify({ discoveryRunId, vendorIndex }),
    }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

import type { AnalyticsData } from "../types";

export const analyticsApi = {
  get: () => req<AnalyticsData>("/analytics"),
};

// Keep Quote type used in type signatures
export type { Quote };
