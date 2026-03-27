import { Request, Response } from "express";
import { z } from "zod";
import * as discoveryService from "../services/discovery.service";
import { scoreVendor } from "../services/trust.service";
import { asyncHandler } from "../middleware/error.middleware";
import { logger } from "../utils/logger";
import type { DiscoverySource } from "../types";

const searchSchema = z.object({
  keyword: z.string().min(1).max(300),
  sources: z.array(z.enum(["google", "thomasnet", "alibaba"])).optional().default(["google"]),
});

const acceptSchema = z.object({
  discoveryRunId: z.string().min(1),
  vendorIndex: z.number().int().min(0),
});

export const searchVendors = asyncHandler(async (req: Request, res: Response) => {
  const { keyword, sources } = searchSchema.parse(req.body);

  // Respond immediately — run in background
  const runs = await discoveryService.discoverVendors(keyword, sources as DiscoverySource[]);
  res.json({ status: "success", data: runs });
});

export const listRuns = asyncHandler(async (_req: Request, res: Response) => {
  const runs = await discoveryService.listDiscoveryRuns();
  res.json({ status: "success", data: runs });
});

export const getRun = asyncHandler(async (req: Request, res: Response) => {
  const run = await discoveryService.getDiscoveryRun(req.params.id);
  if (!run) {
    res.status(404).json({ status: "error", message: "Discovery run not found" });
    return;
  }
  res.json({ status: "success", data: run });
});

export const acceptVendor = asyncHandler(async (req: Request, res: Response) => {
  const { discoveryRunId, vendorIndex } = acceptSchema.parse(req.body);
  const vendor = await discoveryService.acceptDiscoveredVendor(discoveryRunId, vendorIndex);
  res.status(201).json({ status: "success", data: vendor });

  // Auto-trigger trust scoring
  scoreVendor(vendor._id.toString()).catch((err) => {
    logger.warn(`Trust check failed for discovered vendor ${vendor.name}`, { error: err.message });
  });
});
