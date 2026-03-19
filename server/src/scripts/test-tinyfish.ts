/**
 * TinyFish Integration Test Script
 *
 * Usage:
 *   npx tsx src/scripts/test-tinyfish.ts [vendor-url]
 *
 * Examples:
 *   npx tsx src/scripts/test-tinyfish.ts https://www.packlane.com
 *   npx tsx src/scripts/test-tinyfish.ts https://www.thecustomboxes.com
 *
 * This script sends a real SSE request to TinyFish and streams all events to console.
 * Use it to verify your API key and test vendor URL accessibility.
 */

import "../config/env"; // Load + validate env vars first
import { runSSE } from "../services/tinyfish.service";
import { buildTestGoal } from "../services/goal-builder.service";

const vendorUrl = process.argv[2] ?? "https://www.packlane.com";

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  QuotePilot — TinyFish Integration Test");
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Target URL:  ${vendorUrl}`);
console.log(`  API Key:     ${process.env.TINYFISH_API_KEY?.slice(0, 8)}...`);
console.log("═══════════════════════════════════════════════════════════\n");

async function main() {
  const goal = buildTestGoal(vendorUrl);
  console.log("Goal sent to TinyFish:");
  console.log("─────────────────────");
  console.log(goal);
  console.log("─────────────────────\n");

  console.log("Streaming SSE events:\n");

  let eventCount = 0;
  let runId: string | undefined;
  let streamingUrl: string | undefined;

  for await (const event of runSSE({ url: vendorUrl, goal, browserProfile: "lite" })) {
    eventCount++;
    const ts = new Date().toISOString().slice(11, 23);

    switch (event.type) {
      case "STARTED":
        runId = event.runId;
        console.log(`[${ts}] STARTED   runId=${event.runId}`);
        break;

      case "STREAMING_URL":
        streamingUrl = event.streamingUrl;
        console.log(`[${ts}] STREAM    ${event.streamingUrl}`);
        break;

      case "PROGRESS":
        console.log(`[${ts}] PROGRESS  ${event.purpose}`);
        break;

      case "HEARTBEAT":
        console.log(`[${ts}] HEARTBEAT`);
        break;

      case "COMPLETE":
        console.log(`\n[${ts}] COMPLETE  status=${event.status}`);
        if (event.status === "FAILED") {
          console.log(`         error: ${event.error?.message}`);
        } else {
          console.log("\nResult JSON:");
          console.log("────────────");
          console.log(JSON.stringify(event.resultJson, null, 2));
        }
        break;
    }
  }

  console.log("\n===================================================");
  console.log("  Test Summary");
  console.log("===================================================");
  console.log(`  Run ID:        ${runId ?? "N/A"}`);
  console.log(`  Streaming URL: ${streamingUrl ?? "N/A"}`);
  console.log(`  Total events:  ${eventCount}`);
  console.log("  Status:        SUCCESS");
  console.log("===================================================\n");
}

main().catch((err) => {
  console.error("\nTest FAILED:");
  console.error(err instanceof Error ? err.message : String(err));
  console.error("\nCheck that:");
  console.error("  1. TINYFISH_API_KEY is set in .env");
  console.error("  2. The vendor URL is accessible");
  console.error("  3. You have remaining TinyFish credits\n");
  process.exit(1);
});
