import { runSSE } from "./tinyfish.service";
import { Vendor } from "../models/Vendor.model";
import { DiscoveryRun } from "../models/DiscoveryRun.model";
import { broadcastToRFQ } from "../config/socket";
import { logger } from "../utils/logger";
import type { DiscoverySource, IDiscoveryRun } from "../types";

// ─── Goal Templates ───────────────────────────────────────────────────────────

function googleGoal(keyword: string): string {
  return `
Search for "${keyword} manufacturer supplier quote request" in the Google search bar.

From the search results, identify 5 websites that appear to be actual supplier or manufacturer company websites (skip directories like ThomasNet, ads, Amazon, eBay, Walmart, and news articles).

For each supplier website you visit:
1. Note the company name from the page header or About section
2. Note the full website URL (the homepage, not the search result URL)
3. Look for a "Get Quote", "Request Quote", "Contact Us", "Request Pricing", or similar page
4. If you find such a page, note its full URL
5. Check whether the page has an actual online form (input fields) — if yes, set hasOnlineForm to true
6. Try to identify what category of products they specialize in

Do not fill out any forms. Do not click any "Buy Now", "Add to Cart", or "Purchase" buttons.
If a cookie banner or popup appears, close or dismiss it and continue.
If a website requires a login to see the quote form, note hasOnlineForm as false.

Return as JSON with this exact structure:
{
  "vendors": [
    {
      "name": "Example Packaging Co",
      "website": "https://examplepackaging.com",
      "quoteUrl": "https://examplepackaging.com/get-quote",
      "hasOnlineForm": true,
      "category": "packaging"
    }
  ]
}

Return between 3 and 8 vendors. Only include real businesses with real websites.
`.trim();
}

function thomasnetGoal(keyword: string): string {
  return `
Use the ThomasNet search bar to search for "${keyword}".

From the search results page, look at the first 5 supplier listings.

For each supplier:
1. Note the company name
2. Click through to their ThomasNet profile page if possible
3. Look for their actual company website URL (an external link, not the ThomasNet URL)
4. Check if they have a "Request Quote" button or link on their profile
5. Note the product categories listed

Do not submit any quote requests. Do not fill out any forms. Do not click "Request a Quote" buttons.

Return as JSON with this exact structure:
{
  "vendors": [
    {
      "name": "ABC Manufacturing Inc",
      "website": "https://abcmanufacturing.com",
      "quoteUrl": "https://abcmanufacturing.com/quote",
      "hasOnlineForm": true,
      "category": "custom manufacturing"
    }
  ]
}

If the company website is not shown, use the ThomasNet profile URL as the website.
If the quote page URL is not available, set quoteUrl to null.
`.trim();
}

function alibabaGoal(keyword: string): string {
  return `
Search for "${keyword}" using the Alibaba search bar.

From the search results, find the first 5 unique supplier/manufacturer storefronts (not individual product listings — focus on the seller/store name).

For each supplier:
1. Note the company or store name
2. Note their Alibaba store URL (usually ends in .en.alibaba.com)
3. Check if they have a "Contact Supplier" button (set hasOnlineForm to true if yes)
4. Note the product category

Do not contact any suppliers. Do not click "Start Order", "Add to Cart", or any purchase buttons.
If a pop-up appears, close it and continue.

Return as JSON with this exact structure:
{
  "vendors": [
    {
      "name": "Shenzhen Example Trading Co., Ltd.",
      "website": "https://exampletrading.en.alibaba.com",
      "quoteUrl": "https://exampletrading.en.alibaba.com",
      "hasOnlineForm": true,
      "category": "packaging"
    }
  ]
}

Skip any listing that is an ad or a gold supplier promotion without a real storefront.
`.trim();
}

const SOURCE_CONFIG: Record<DiscoverySource, { url: string; goal: (kw: string) => string }> = {
  google:    { url: "https://www.google.com",    goal: googleGoal },
  thomasnet: { url: "https://www.thomasnet.com", goal: thomasnetGoal },
  alibaba:   { url: "https://www.alibaba.com",   goal: alibabaGoal },
};

// ─── Internal: parse raw TinyFish result ──────────────────────────────────────

function parseResult(raw: unknown): IDiscoveryRun["vendorsFound"] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as any;
  const vendors = Array.isArray(r.vendors) ? r.vendors : [];
  return vendors.slice(0, 8).map((v: any) => ({
    name:          String(v.name || "Unknown"),
    website:       String(v.website || ""),
    quoteUrl:      v.quoteUrl || v.quote_url || undefined,
    hasOnlineForm: Boolean(v.hasOnlineForm ?? v.has_online_form ?? false),
    category:      v.category || undefined,
    addedToRegistry: false,
  }));
}

// ─── Run a single discovery agent ────────────────────────────────────────────

async function runDiscoveryAgent(
  searchQuery: string,
  source: DiscoverySource,
  onEvent?: (event: unknown) => void
): Promise<IDiscoveryRunDocument> {
  const run = await DiscoveryRun.create({
    searchQuery,
    source,
    status: "running",
    vendorsFound: [],
  });

  const { url, goal } = SOURCE_CONFIG[source];

  try {
    let stepsUsed = 0;
    let resultJson: unknown = null;

    for await (const event of runSSE({ url, goal: goal(searchQuery), browserProfile: "stealth" })) {
      stepsUsed++;
      if (event.type === "STARTED") {
        run.tinyfishRunId = event.runId;
        await run.save();
      }
      if (event.type === "PROGRESS") {
        onEvent?.({ type: "PROGRESS", source, runId: run._id, data: { purpose: event.purpose } });
      }
      if (event.type === "COMPLETE") {
        resultJson = event.resultJson;
      }
    }

    run.vendorsFound = parseResult(resultJson);
    run.status       = "completed";
    run.stepsUsed    = stepsUsed;
    run.completedAt  = new Date();
    await run.save();

    onEvent?.({ type: "COMPLETE", source, runId: run._id, data: { vendorsFound: run.vendorsFound.length } });
    logger.info(`Discovery [${source}] found ${run.vendorsFound.length} vendors for "${searchQuery}"`);

  } catch (err: any) {
    run.status = "failed";
    await run.save();
    onEvent?.({ type: "ERROR", source, runId: run._id, data: { error: err.message } });
    logger.error(`Discovery [${source}] failed for "${searchQuery}"`, { error: err.message });
    throw err;
  }

  return run as unknown as IDiscoveryRunDocument;
}

// Workaround for circular type reference
type IDiscoveryRunDocument = Awaited<ReturnType<typeof DiscoveryRun.create>>;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function discoverVendors(
  searchQuery: string,
  sources: DiscoverySource[] = ["google"],
  onEvent?: (event: unknown) => void
): Promise<typeof DiscoveryRun["prototype"][]> {
  const results = await Promise.allSettled(
    sources.map((source) => runDiscoveryAgent(searchQuery, source, onEvent))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function acceptDiscoveredVendor(
  discoveryRunId: string,
  vendorIndex: number
): Promise<typeof Vendor["prototype"]> {
  const run = await DiscoveryRun.findById(discoveryRunId);
  if (!run) throw new Error("Discovery run not found");

  const found = run.vendorsFound[vendorIndex];
  if (!found) throw new Error("Vendor index out of range");

  const vendor = await Vendor.create({
    name:          found.name,
    website:       found.website,
    quoteUrl:      found.quoteUrl || found.website,
    tags:          found.category ? [found.category] : [],
    browserProfile: "stealth",
    isActive:       true,
    reliability:    50,
    trustStatus:    "pending",
    discoveredFrom: run.source,
    discoveredAt:   new Date(),
  });

  run.vendorsFound[vendorIndex].addedToRegistry = true;
  run.markModified("vendorsFound");
  await run.save();

  logger.info(`Vendor accepted from discovery: ${found.name}`);
  return vendor;
}

export async function listDiscoveryRuns(limit = 10) {
  return DiscoveryRun.find().sort({ createdAt: -1 }).limit(limit).lean();
}

export async function getDiscoveryRun(id: string) {
  return DiscoveryRun.findById(id).lean();
}
