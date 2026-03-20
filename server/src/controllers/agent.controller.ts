import { Request, Response } from "express";
import { AgentRun } from "../models/AgentRun.model";
import { cancelRun } from "../services/tinyfish.service";
import { asyncHandler } from "../middleware/error.middleware";
import { logger } from "../utils/logger";
import type { AgentStreamEvent } from "../types";

// ─── SSE Client Registry ──────────────────────────────────────────────────────
// Maps rfqId → array of active SSE Response objects
const sseClients = new Map<string, Response[]>();

/**
 * GET /api/agent/stream/:rfqId
 * Frontend connects here to receive real-time agent events via SSE.
 */
export function streamAgentEvents(req: Request, res: Response): void {
  const { rfqId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  });

  // Send initial connection event
  res.write(
    `data: ${JSON.stringify({
      rfqId,
      vendorId: "",
      vendorName: "System",
      type: "CONNECTED",
      data: {},
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Register this client
  if (!sseClients.has(rfqId)) sseClients.set(rfqId, []);
  sseClients.get(rfqId)!.push(res);

  logger.info(`SSE client connected for RFQ ${rfqId}. Total clients: ${sseClients.get(rfqId)!.length}`);

  // Heartbeat every 25s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(
      `data: ${JSON.stringify({ type: "HEARTBEAT", timestamp: new Date().toISOString() })}\n\n`
    );
  }, 25000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(rfqId) ?? [];
    sseClients.set(rfqId, clients.filter((c) => c !== res));
    logger.info(`SSE client disconnected for RFQ ${rfqId}. Remaining: ${sseClients.get(rfqId)!.length}`);
  });
}

/**
 * Broadcast an event to all SSE clients subscribed to an RFQ.
 * Called from rfq.service.ts during agent execution.
 */
export function broadcastToRFQ(rfqId: string, event: AgentStreamEvent): void {
  const clients = sseClients.get(rfqId) ?? [];
  if (clients.length === 0) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const dead: Response[] = [];

  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      dead.push(client);
    }
  }

  // Remove dead connections
  if (dead.length > 0) {
    sseClients.set(rfqId, clients.filter((c) => !dead.includes(c)));
  }
}

/**
 * GET /api/agent/runs/:rfqId
 * Get all agent runs for an RFQ (for replay / history).
 */
export const getAgentRuns = asyncHandler(async (req: Request, res: Response) => {
  const runs = await AgentRun.find({ rfqId: req.params.rfqId })
    .populate("vendorId", "name website category")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ status: "success", data: runs });
});

/**
 * POST /api/agent/cancel/:runId
 * Cancel a running TinyFish agent.
 */
export const cancelAgent = asyncHandler(async (req: Request, res: Response) => {
  const run = await AgentRun.findById(req.params.runId);
  if (!run) {
    res.status(404).json({ status: "error", message: "Agent run not found" });
    return;
  }

  if (run.tinyfishRunId) {
    await cancelRun(run.tinyfishRunId);
  }

  run.status = "cancelled";
  run.completedAt = new Date();
  await run.save();

  res.json({ status: "success", message: "Agent cancelled" });
});
