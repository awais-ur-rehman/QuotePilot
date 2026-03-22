import { runSync } from "./tinyfish.service";
import { Quote } from "../models/Quote.model";
import { logger } from "../utils/logger";
import type { IRFQ } from "../types";

// ─── Goal Templates ───────────────────────────────────────────────────────────

function fedexGoal(destZip: string, weight: string, dims: string): string {
  return `
Use the FedEx rate calculator to estimate a shipping cost.

Fill in the shipping form with:
- From/Origin ZIP code: 90210
- To/Destination ZIP code: ${destZip}
- Package type: "Your Packaging" or custom packaging (not a FedEx box)
- Weight: ${weight} lbs
- Dimensions: ${dims} inches (interpret as Length x Width x Height)
- Number of packages: 1

If the form asks for residential vs commercial, select commercial.
If asked for shipping date, select tomorrow's date or the next available date.
Click the "Get Rates", "Show Rates", or "Calculate" button.

Wait for results to load. Extract the cheapest available ground shipping rate and estimated delivery days.

Do not select any shipping option. Do not proceed to any checkout. Do not create an account.
If a cookie banner or login popup appears, close it and continue.

Return as JSON with this exact structure:
{
  "rate": 45.99,
  "days": 5,
  "service": "FedEx Ground"
}

If rate calculation fails or no rates are shown:
{
  "rate": null,
  "days": null,
  "service": null
}
`.trim();
}

function upsGoal(destZip: string, weight: string, dims: string): string {
  return `
Use the UPS shipping estimate or rate calculator tool on this page.

Fill in the shipping details:
- Ship from ZIP code: 90210
- Ship to ZIP code: ${destZip}
- Shipping date: Tomorrow or the next available date
- Package type: Package or Box
- Weight: ${weight} lbs
- Dimensions (if asked): ${dims} inches

Click "Get a Quote", "Estimate", or "Calculate" to see rates.

Wait for results to load. Extract the cheapest available ground or standard rate and estimated delivery time.

Do not sign in. Do not create an account. Do not proceed past the rate estimate page.
If a cookie banner appears, close it and continue.

Return as JSON with this exact structure:
{
  "rate": 38.50,
  "days": 4,
  "service": "UPS Ground"
}

If rate calculation fails:
{
  "rate": null,
  "days": null,
  "service": null
}
`.trim();
}

// ─── Weight estimator ─────────────────────────────────────────────────────────

function estimateWeight(specs: IRFQ["specs"]): string {
  const qty = specs.quantity || 1;
  if (qty <= 50)   return "5";
  if (qty <= 200)  return "15";
  if (qty <= 500)  return "25";
  if (qty <= 1000) return "50";
  return "100";
}

// ─── Carrier checks ───────────────────────────────────────────────────────────

async function checkFedEx(
  destZip: string,
  weight: string,
  dims: string
): Promise<{ fedexRate?: number; estimatedDays?: number } | null> {
  try {
    const result = await runSync({
      url: "https://www.fedex.com/en-us/online/rating.html",
      goal: fedexGoal(destZip, weight, dims),
      browserProfile: "stealth",
    });
    const r = result?.result as any;
    if (!r || r.rate == null) return null;
    return { fedexRate: Number(r.rate), estimatedDays: r.days ? Number(r.days) : undefined };
  } catch (err: any) {
    logger.warn("FedEx rate check failed", { error: err.message });
    return null;
  }
}

async function checkUPS(
  destZip: string,
  weight: string,
  dims: string
): Promise<{ upsRate?: number } | null> {
  try {
    const result = await runSync({
      url: "https://www.ups.com/ship/guided/origin",
      goal: upsGoal(destZip, weight, dims),
      browserProfile: "stealth",
    });
    const r = result?.result as any;
    if (!r || r.rate == null) return null;
    return { upsRate: Number(r.rate) };
  } catch (err: any) {
    logger.warn("UPS rate check failed", { error: err.message });
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function estimateShipping(
  quoteId: string,
  rfq: IRFQ,
  onEvent?: (event: { type: string; data: unknown }) => void
): Promise<void> {
  const quote = await Quote.findById(quoteId);
  if (!quote || !quote.unitPrice) {
    await Quote.findByIdAndUpdate(quoteId, { shippingStatus: "skipped" });
    return;
  }

  await Quote.findByIdAndUpdate(quoteId, { shippingStatus: "estimating" });

  onEvent?.({ type: "PROGRESS", data: { purpose: `Estimating shipping for quote ${quoteId}` } });

  const destZip = rfq.shippingDetails?.destinationZip || "10001";
  const weight = rfq.shippingDetails?.estimatedWeight || estimateWeight(rfq.specs);
  const dims = rfq.specs.dimensions || "12x12x6";

  const [fedexResult, upsResult] = await Promise.allSettled([
    checkFedEx(destZip, weight, dims),
    checkUPS(destZip, weight, dims),
  ]);

  const shippingData: NonNullable<(typeof quote)["shipping"]> = {
    packageWeight: weight,
    packageDimensions: dims,
  };

  if (fedexResult.status === "fulfilled" && fedexResult.value) {
    shippingData.fedexRate = fedexResult.value.fedexRate;
    shippingData.estimatedDays = fedexResult.value.estimatedDays;
    onEvent?.({ type: "PROGRESS", data: { purpose: `FedEx rate: $${fedexResult.value.fedexRate?.toFixed(2)}` } });
  }
  if (upsResult.status === "fulfilled" && upsResult.value) {
    shippingData.upsRate = upsResult.value.upsRate;
    onEvent?.({ type: "PROGRESS", data: { purpose: `UPS rate: $${upsResult.value.upsRate?.toFixed(2)}` } });
  }

  // Pick cheapest carrier
  const rates: Array<{ carrier: string; rate: number }> = [];
  if (shippingData.fedexRate != null) rates.push({ carrier: "FedEx", rate: shippingData.fedexRate });
  if (shippingData.upsRate   != null) rates.push({ carrier: "UPS",   rate: shippingData.upsRate });

  if (rates.length > 0) {
    const cheapest = rates.reduce((a, b) => (a.rate < b.rate ? a : b));
    shippingData.cheapestCarrier = cheapest.carrier;
    shippingData.cheapestRate    = cheapest.rate;
  }

  const shippingStatus = rates.length > 0 ? "completed" : "failed";
  let totalLandedCost: number | undefined;

  if (quote.unitPrice && shippingData.cheapestRate != null) {
    totalLandedCost = quote.unitPrice * (rfq.specs.quantity || 1) + shippingData.cheapestRate;
  }

  await Quote.findByIdAndUpdate(quoteId, {
    shipping: shippingData,
    shippingStatus,
    ...(totalLandedCost != null ? { totalLandedCost } : {}),
  });

  onEvent?.({
    type: "COMPLETE",
    data: {
      cheapestCarrier: shippingData.cheapestCarrier,
      cheapestRate: shippingData.cheapestRate,
      totalLandedCost,
    },
  });

  logger.info(`Shipping estimated for quote ${quoteId}: ${shippingData.cheapestCarrier} $${shippingData.cheapestRate}`);
}
