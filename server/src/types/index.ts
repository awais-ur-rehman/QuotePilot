import { Types } from "mongoose";

// ─── TinyFish API ────────────────────────────────────────────────────────────

export type BrowserProfile = "lite" | "stealth";

export interface TinyFishRequest {
  url: string;
  goal: string;
  browserProfile?: BrowserProfile;
  proxyCountry?: string;
}

export type TinyFishEvent =
  | { type: "STARTED"; runId: string }
  | { type: "STREAMING_URL"; streamingUrl: string }
  | { type: "PROGRESS"; purpose: string }
  | { type: "HEARTBEAT" }
  | { type: "COMPLETE"; status: "COMPLETED" | "FAILED"; resultJson: unknown; error?: { message: string } };

export interface TinyFishRunResponse {
  run_id: string;
  status: string;
  result?: unknown;
  error?: { message: string };
}

// ─── Quote result extracted by TinyFish ──────────────────────────────────────

export interface ExtractedQuote {
  submitted: boolean;
  price: number | null;
  currency: string | null;
  unitPrice: number | null;
  leadTime: string | null;
  minimumOrder: number | null;
  shippingCost: number | null;
  confirmationId: string | null;
  notes: string | null;
}

// ─── SSE Bridge (server → frontend) ─────────────────────────────────────────

export interface AgentStreamEvent {
  rfqId: string;
  vendorId: string;
  vendorName: string;
  type: "STARTED" | "PROGRESS" | "STREAMING_URL" | "COMPLETE" | "ERROR" | "HEARTBEAT";
  data: unknown;
  timestamp: string;
}

// ─── Model interfaces ─────────────────────────────────────────────────────────

export type RFQStatus = "draft" | "running" | "completed" | "failed";
export type QuoteStatus = "pending" | "running" | "completed" | "failed" | "no_quote";
export type AgentRunStatus = "queued" | "started" | "running" | "completed" | "failed" | "cancelled";

export interface IVendor {
  _id: Types.ObjectId;
  name: string;
  website: string;
  quoteUrl: string;
  category: string;
  formInstructions: string;
  browserProfile: BrowserProfile;
  isActive: boolean;
  reliability: number;
  avgSteps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRFQ {
  _id: Types.ObjectId;
  title: string;
  description: string;
  specs: {
    productType: string;
    quantity: number;
    dimensions?: string;
    material?: string;
    color?: string;
    customFields: Record<string, string>;
  };
  contactInfo: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
  };
  status: RFQStatus;
  vendorIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuote {
  _id: Types.ObjectId;
  rfqId: Types.ObjectId;
  vendorId: Types.ObjectId;
  agentRunId: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgentRun {
  _id: Types.ObjectId;
  rfqId: Types.ObjectId;
  vendorId: Types.ObjectId;
  quoteId: Types.ObjectId;
  tinyfishRunId?: string;
  streamingUrl?: string;
  status: AgentRunStatus;
  events: Array<{
    type: string;
    data: unknown;
    timestamp: Date;
  }>;
  startedAt?: Date;
  completedAt?: Date;
}
