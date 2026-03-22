import { runSync } from "./tinyfish.service";
import { Quote } from "../models/Quote.model";
import { RFQ } from "../models/RFQ.model";
import { logger } from "../utils/logger";

function alibabaGoal(productType: string, quantity: number): string {
  return `
Search for "${productType}" using the search bar on Alibaba.

From the search results, extract the price range from the first 6 product listings.

For each listing, extract:
1. The unit price (the per-piece or per-unit price — NOT the total order cost)
2. The minimum order quantity shown

Skip listings that only show "Contact Supplier" with no price visible.
Skip listings that are clearly unrelated to "${productType}".
If prices are shown as a range (e.g. "$0.50 - $2.00"), use the midpoint ($1.25).
If prices are shown per-carton or per-bundle, estimate the per-unit price.

Do not click "Contact Supplier". Do not click "Start Order". Do not add anything to cart.
If a popup, banner, or login wall appears, close it and continue.

Return as JSON with this exact structure:
{
  "prices": [0.89, 1.20, 0.75, 1.50, 0.95, 1.10],
  "currency": "USD",
  "product_search": "${productType}",
  "listings_found": 6
}

If no prices can be found:
{
  "prices": [],
  "currency": "USD",
  "product_search": "${productType}",
  "listings_found": 0
}
`.trim();
}

export async function benchmarkRFQ(
  rfqId: string,
  onEvent?: (event: { type: string; data: unknown }) => void
): Promise<void> {
  const rfq = await RFQ.findById(rfqId).lean();
  if (!rfq) throw new Error("RFQ not found");

  onEvent?.({ type: "PROGRESS", data: { purpose: `Searching Alibaba for market prices: "${rfq.specs.productType}"` } });

  let marketData: { avgPrice: number; sources: string[] } | null = null;

  try {
    const result = await runSync({
      url: "https://www.alibaba.com",
      goal: alibabaGoal(rfq.specs.productType, rfq.specs.quantity),
      browserProfile: "stealth",
    });

    const r = result?.result as any;
    if (r?.prices && Array.isArray(r.prices) && r.prices.length > 0) {
      const numericPrices = r.prices
        .map((p: unknown) => (typeof p === "number" ? p : parseFloat(String(p))))
        .filter((p: number) => !isNaN(p) && p > 0);

      if (numericPrices.length > 0) {
        marketData = {
          avgPrice: numericPrices.reduce((a: number, b: number) => a + b, 0) / numericPrices.length,
          sources: ["alibaba"],
        };
        onEvent?.({
          type: "PROGRESS",
          data: { purpose: `Market avg found: $${marketData.avgPrice.toFixed(2)}/unit (${numericPrices.length} listings)` },
        });
      }
    }
  } catch (err: any) {
    logger.warn("Alibaba benchmark search failed", { rfqId, error: err.message });
  }

  if (!marketData) {
    await Quote.updateMany({ rfqId, status: "completed" }, { benchmarkStatus: "skipped" });
    onEvent?.({ type: "COMPLETE", data: { skipped: true, reason: "No market data found" } });
    return;
  }

  const quotes = await Quote.find({ rfqId, status: "completed" });

  for (const quote of quotes) {
    if (quote.unitPrice != null) {
      const percentDiff = Math.round(
        ((quote.unitPrice - marketData.avgPrice) / marketData.avgPrice) * 100
      );
      quote.marketBenchmark = {
        avgMarketPrice: marketData.avgPrice,
        pricePosition: percentDiff < -5 ? "below_market" : percentDiff > 5 ? "above_market" : "at_market",
        percentDiff,
        sourcesChecked: marketData.sources,
        lastChecked: new Date(),
      };
      quote.benchmarkStatus = "completed";
    } else {
      quote.benchmarkStatus = "skipped";
    }
    await quote.save();
  }

  onEvent?.({
    type: "COMPLETE",
    data: { avgMarketPrice: marketData.avgPrice, quotesUpdated: quotes.length },
  });

  logger.info(`Market benchmark complete for RFQ ${rfqId}. Avg: $${marketData.avgPrice.toFixed(3)}`);
}
