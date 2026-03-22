import { runSync } from "./tinyfish.service";
import { Vendor } from "../models/Vendor.model";
import { logger } from "../utils/logger";

// ─── Goal Templates ───────────────────────────────────────────────────────────

const BBB_GRADE_MAP: Record<string, number> = {
  "A+": 98, "A": 93, "A-": 90, "B+": 87, "B": 83, "B-": 80,
  "C+": 77, "C": 73, "C-": 70, "D+": 67, "D": 63, "D-": 60, "F": 40,
};

function bbbGoal(companyName: string): string {
  return `
Use the search bar on the BBB website to search for "${companyName}".

If search results appear, click on the most relevant business result that matches the name "${companyName}".

On the business profile page, extract:
1. The BBB letter rating (e.g. "A+", "B-", "F")
2. Whether the business is BBB Accredited (true or false)
3. The number of complaints filed in the last 3 years (if shown)
4. Years in business (if shown)

If no matching business is found, or the search returns zero results, return the not_found response below.
Do not click "File a Complaint" or "Write a Review". Do not click any "Contact Business" links.

Return as JSON with this exact structure:
{
  "found": true,
  "rating": "A+",
  "accredited": true,
  "complaints": 3,
  "years_in_business": 12
}

If not found:
{
  "found": false,
  "rating": null,
  "accredited": null,
  "complaints": null,
  "years_in_business": null
}
`.trim();
}

function trustpilotGoal(domain: string): string {
  return `
This page should show the Trustpilot profile for the company with domain ${domain}.

If the page shows a company profile with reviews:
1. Extract the overall trust score (a number out of 5, e.g. 4.2)
2. Extract the total number of reviews shown

If the page shows "not found" or redirects to a search page:
1. Use the Trustpilot search bar to search for "${domain}"
2. If a matching company result appears, click it and extract the information above
3. If no match is found, return the not_found response

Do not write any reviews. Do not click "Write a Review". Do not sign in.

Return as JSON with this exact structure:
{
  "found": true,
  "score": 4.2,
  "review_count": 1523
}

If not found:
{
  "found": false,
  "score": null,
  "review_count": null
}
`.trim();
}

function googleMapsGoal(companyName: string): string {
  return `
Search for "${companyName}" in Google Maps using the search bar.

If a business listing appears that matches this company name:
1. Click on the most relevant result
2. Extract the star rating (a number out of 5, e.g. 4.5)
3. Extract the total number of reviews shown

Do not write any reviews. Do not click "Directions" or "Call". Do not click any "Book" or "Order" buttons.

Return as JSON with this exact structure:
{
  "found": true,
  "rating": 4.5,
  "review_count": 234
}

If the business is not found in Google Maps:
{
  "found": false,
  "rating": null,
  "review_count": null
}
`.trim();
}

// ─── Individual checks ────────────────────────────────────────────────────────

async function checkBBB(companyName: string): Promise<{ data: Partial<NonNullable<typeof Vendor.prototype.trustData>>; score: number | null }> {
  try {
    const result = await runSync({
      url: "https://www.bbb.org",
      goal: bbbGoal(companyName),
      browserProfile: "stealth",
    });
    const r = result?.result as any;
    if (!r?.found) return { data: {}, score: null };
    const score = r.rating ? (BBB_GRADE_MAP[r.rating] ?? 50) : null;
    return {
      data: {
        bbbRating:        r.rating         ?? undefined,
        bbbAccredited:    r.accredited      ?? undefined,
        bbbComplaints:    r.complaints      ?? undefined,
        yearsInBusiness:  r.years_in_business ?? undefined,
      },
      score,
    };
  } catch (err: any) {
    logger.warn("BBB check failed", { companyName, error: err.message });
    return { data: {}, score: null };
  }
}

async function checkTrustpilot(website: string): Promise<{ data: Partial<NonNullable<typeof Vendor.prototype.trustData>>; score: number | null }> {
  try {
    let domain = website;
    try { domain = new URL(website).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }

    const result = await runSync({
      url: `https://www.trustpilot.com/review/${domain}`,
      goal: trustpilotGoal(domain),
      browserProfile: "stealth",
    });
    const r = result?.result as any;
    if (!r?.found) return { data: {}, score: null };
    const score = r.score ? Math.round((r.score / 5) * 100) : null;
    return {
      data: {
        trustpilotScore:   r.score        ?? undefined,
        trustpilotReviews: r.review_count ?? undefined,
      },
      score,
    };
  } catch (err: any) {
    logger.warn("Trustpilot check failed", { website, error: err.message });
    return { data: {}, score: null };
  }
}

async function checkGoogle(companyName: string): Promise<{ data: Partial<NonNullable<typeof Vendor.prototype.trustData>>; score: number | null }> {
  try {
    const result = await runSync({
      url: "https://www.google.com/maps",
      goal: googleMapsGoal(companyName),
      browserProfile: "stealth",
    });
    const r = result?.result as any;
    if (!r?.found) return { data: {}, score: null };
    const score = r.rating ? Math.round((r.rating / 5) * 100) : null;
    return {
      data: {
        googleRating:  r.rating       ?? undefined,
        googleReviews: r.review_count ?? undefined,
      },
      score,
    };
  } catch (err: any) {
    logger.warn("Google Maps check failed", { companyName, error: err.message });
    return { data: {}, score: null };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function scoreVendor(
  vendorId: string,
  onEvent?: (event: { type: string; data: unknown }) => void
): Promise<void> {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new Error("Vendor not found");

  vendor.trustStatus = "checking";
  await vendor.save();

  onEvent?.({ type: "PROGRESS", data: { purpose: `Checking trust for ${vendor.name}...` } });

  const [bbbRes, tpRes, gRes] = await Promise.allSettled([
    checkBBB(vendor.name),
    checkTrustpilot(vendor.website),
    checkGoogle(vendor.name),
  ]);

  const trustData: NonNullable<typeof vendor.trustData> = { lastChecked: new Date() };
  const scores: number[] = [];

  for (const result of [bbbRes, tpRes, gRes]) {
    if (result.status === "fulfilled" && result.value) {
      Object.assign(trustData, result.value.data);
      if (result.value.score !== null) scores.push(result.value.score);
    }
  }

  vendor.trustScore  = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : undefined;
  vendor.trustData   = trustData;
  vendor.trustStatus = scores.length > 0 ? "scored" : "failed";
  await vendor.save();

  onEvent?.({
    type: "COMPLETE",
    data: { vendorName: vendor.name, trustScore: vendor.trustScore, trustStatus: vendor.trustStatus },
  });

  logger.info(`Trust score for ${vendor.name}: ${vendor.trustScore ?? "N/A"} (${vendor.trustStatus})`);
}
