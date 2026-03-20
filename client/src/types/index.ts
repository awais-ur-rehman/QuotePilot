// Shared frontend types — mirrored from server interfaces

export type RFQStatus = "draft" | "running" | "completed" | "failed";
export type QuoteStatus = "pending" | "running" | "completed" | "failed" | "no_quote";
export type AgentRunStatus = "queued" | "started" | "running" | "completed" | "failed" | "cancelled";

export interface Vendor {
  _id: string;
  name: string;
  website: string;
  quoteUrl: string;
  category: string;
  formInstructions: string;
  browserProfile: "lite" | "stealth";
  isActive: boolean;
  reliability: number;
  avgSteps: number;
  createdAt: string;
  updatedAt: string;
}

export interface RFQSpecs {
  productType: string;
  quantity: number;
  dimensions?: string;
  material?: string;
  color?: string;
  customFields: Record<string, string>;
}

export interface ContactInfo {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
}

export interface RFQ {
  _id: string;
  title: string;
  description: string;
  specs: RFQSpecs;
  contactInfo: ContactInfo;
  status: RFQStatus;
  vendorIds: string[];
  createdAt: string;
  updatedAt: string;
  quotes?: Quote[];
}

// Mongoose populates vendorId in-place → it becomes an object after the API call
export interface PopulatedVendorRef {
  _id: string;
  name: string;
  website: string;
  category: string;
}

export interface Quote {
  _id: string;
  rfqId: string;
  // populated by server: arrives as an object, not a raw string
  vendorId: string | PopulatedVendorRef;
  agentRunId: string;
  status: QuoteStatus;
  price?: number;
  currency?: string;
  unitPrice?: number;
  leadTime?: string;
  minimumOrder?: number;
  shippingCost?: number;
  notes?: string;
  rawResult?: unknown;
  errorMessage?: string;
  stepsUsed?: number;
  costUsd?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  _id: string;
  rfqId: string;
  vendorId: string;
  quoteId: string;
  tinyfishRunId?: string;
  streamingUrl?: string;
  status: AgentRunStatus;
  events: Array<{ type: string; data: unknown; timestamp: string }>;
  startedAt?: string;
  completedAt?: string;
}

// SSE bridge event (server → frontend)
export interface AgentStreamEvent {
  rfqId: string;
  vendorId: string;
  vendorName: string;
  type: "STARTED" | "PROGRESS" | "STREAMING_URL" | "COMPLETE" | "ERROR" | "HEARTBEAT";
  data: unknown;
  timestamp: string;
}

// API response wrapper
export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
  errors?: unknown[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
