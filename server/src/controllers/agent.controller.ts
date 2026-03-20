import { Request, Response } from "express";
import { AgentRun } from "../models/AgentRun.model";
import { cancelRun } from "../services/tinyfish.service";
import { asyncHandler } from "../middleware/error.middleware";
import { logger } from "../utils/logger";

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

  logger.info(`Agent run ${run._id} cancelled`);
  res.json({ status: "success", message: "Agent cancelled" });
});
