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

export type RFQStatus = "draft" | "running" | "completed" | "failed" | "cancelled" | "awarded";
export type QuoteStatus = "pending" | "running" | "completed" | "failed" | "no_quote";
export type AgentRunStatus = "queued" | "started" | "running" | "completed" | "failed" | "cancelled";
export type TrustStatus = "pending" | "checking" | "scored" | "failed";
export type ShippingStatus = "pending" | "estimating" | "completed" | "failed" | "skipped";
export type BenchmarkStatus = "pending" | "checking" | "completed" | "failed" | "skipped";
export type PipelineStage = "quotes" | "shipping" | "benchmarking" | "complete";

export interface IVendor {
  _id: Types.ObjectId;
  name: string;
  website: string;
  quoteUrl: string;
  tags: string[];
  formInstructions: string;
  browserProfile: BrowserProfile;
  isActive: boolean;
  reliability: number;
  avgSteps: number;
  // Discovery metadata
  discoveredFrom?: string;
  discoveredAt?: Date;
  // Trust scoring
  trustScore?: number;
  trustData?: {
    bbbRating?: string;
    bbbAccredited?: boolean;
    bbbComplaints?: number;
    trustpilotScore?: number;
    trustpilotReviews?: number;
    googleRating?: number;
    googleReviews?: number;
    yearsInBusiness?: number;
    lastChecked?: Date;
  };
  trustStatus?: TrustStatus;
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
  awardedVendorId?: Types.ObjectId;
  awardNotes?: string;
  shippingDetails?: {
    destinationZip?: string;
    destinationCountry?: string;
    estimatedWeight?: string;
    packageType?: string;
  };
  pipelineStage?: PipelineStage;
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
  // Shipping estimation (populated by Shipping Estimator Agent)
  shipping?: {
    fedexRate?: number;
    upsRate?: number;
    cheapestCarrier?: string;
    cheapestRate?: number;
    estimatedDays?: number;
    packageWeight?: string;
    packageDimensions?: string;
  };
  shippingStatus?: ShippingStatus;
  totalLandedCost?: number;
  // Market benchmark (populated by Market Price Check Agent)
  marketBenchmark?: {
    avgMarketPrice?: number;
    pricePosition?: "below_market" | "at_market" | "above_market";
    percentDiff?: number;
    sourcesChecked?: string[];
    lastChecked?: Date;
  };
  benchmarkStatus?: BenchmarkStatus;
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

// ─── Discovery Run ────────────────────────────────────────────────────────────

export type DiscoverySource = "google" | "thomasnet" | "alibaba";
export type DiscoveryStatus = "pending" | "running" | "completed" | "failed";

export interface IDiscoveryRun {
  _id: Types.ObjectId;
  searchQuery: string;
  source: DiscoverySource;
  tinyfishRunId?: string;
  status: DiscoveryStatus;
  vendorsFound: Array<{
    name: string;
    website: string;
    quoteUrl?: string;
    hasOnlineForm: boolean;
    category?: string;
    addedToRegistry: boolean;
  }>;
  stepsUsed?: number;
  createdAt: Date;
  completedAt?: Date;
}
