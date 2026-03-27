// Shared frontend types — mirrored from server interfaces

export type RFQStatus = "draft" | "running" | "completed" | "failed" | "cancelled" | "awarded";
export type QuoteStatus = "pending" | "running" | "completed" | "failed" | "no_quote";
export type AgentRunStatus = "queued" | "started" | "running" | "completed" | "failed" | "cancelled";
export type TrustStatus = "pending" | "checking" | "scored" | "failed";
export type ShippingStatus = "pending" | "estimating" | "completed" | "failed" | "skipped";
export type BenchmarkStatus = "pending" | "checking" | "completed" | "failed" | "skipped";
export type PipelineStage = "quotes" | "shipping" | "benchmarking" | "complete";
export type DiscoverySource = "google" | "thomasnet" | "alibaba";

export interface Vendor {
  _id: string;
  name: string;
  website: string;
  quoteUrl: string;
  tags: string[];
  formInstructions: string;
  browserProfile: "lite" | "stealth";
  isActive: boolean;
  reliability: number;
  avgSteps: number;
  // Discovery
  discoveredFrom?: string;
  discoveredAt?: string;
  // Trust
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
    lastChecked?: string;
  };
  trustStatus?: TrustStatus;
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

export interface ShippingDetails {
  destinationZip?: string;
  destinationCountry?: string;
  estimatedWeight?: string;
  packageType?: "box" | "pallet" | "envelope";
}

export interface RFQ {
  _id: string;
  title: string;
  description: string;
  specs: RFQSpecs;
  contactInfo: ContactInfo;
  status: RFQStatus;
  vendorIds: string[];
  awardedVendorId?: string;
  awardNotes?: string;
  shippingDetails?: ShippingDetails;
  pipelineStage?: PipelineStage;
  createdAt: string;
  updatedAt: string;
  quotes?: Quote[];
}

// Analytics types
export interface VendorStat {
  vendorId: string;
  vendorName: string;
  total: number;
  completed: number;
  successRate: number;
  avgUnitPrice: number | null;
  minUnitPrice: number | null;
  avgSteps: number | null;
}

export interface AnalyticsData {
  summary: {
    totalRFQs: number;
    totalQuotes: number;
    completedQuotes: number;
    successRate: number;
    hoursSaved: number;
  };
  vendorStats: VendorStat[];
  recentRFQs: RFQ[];
}

// Mongoose populates vendorId in-place → it becomes an object after the API call
export interface PopulatedVendorRef {
  _id: string;
  name: string;
  website: string;
  tags: string[];
  trustScore?: number;
  trustStatus?: TrustStatus;
}

// ─── RFQ Templates (localStorage) ────────────────────────────────────────────

export interface RFQTemplate {
  id: string;
  name: string;
  createdAt: string;
  specs: {
    productType: string;
    quantity: number;
    dimensions?: string;
    material?: string;
    color?: string;
    customFields?: Record<string, string>;
  };
  description?: string;
}

export interface Quote {
  _id: string;
  rfqId: string;
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
  // Shipping estimation
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
  // Market benchmark
  marketBenchmark?: {
    avgMarketPrice?: number;
    pricePosition?: "below_market" | "at_market" | "above_market";
    percentDiff?: number;
    sourcesChecked?: string[];
    lastChecked?: string;
  };
  benchmarkStatus?: BenchmarkStatus;
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

// ─── Discovery ────────────────────────────────────────────────────────────────

export interface DiscoveredVendor {
  name: string;
  website: string;
  quoteUrl?: string;
  hasOnlineForm: boolean;
  category?: string;
  addedToRegistry: boolean;
}

export interface DiscoveryRun {
  _id: string;
  searchQuery: string;
  source: DiscoverySource;
  status: "pending" | "running" | "completed" | "failed";
  vendorsFound: DiscoveredVendor[];
  stepsUsed?: number;
  createdAt: string;
  completedAt?: string;
}
