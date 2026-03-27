import { Request, Response } from "express";
import { z } from "zod";
import * as rfqService from "../services/rfq.service";
import { asyncHandler } from "../middleware/error.middleware";
import { logger } from "../utils/logger";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createRFQSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().default(""),
  specs: z.object({
    productType: z.string().min(1),
    quantity: z.number().int().positive(),
    dimensions: z.string().optional(),
    material: z.string().optional(),
    color: z.string().optional(),
    customFields: z.record(z.string(), z.string()).optional().default({}),
  }),
  contactInfo: z.object({
    companyName: z.string().min(1),
    contactName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  vendorIds: z.array(z.string().min(1)).min(1, "At least one vendor required"),
  shippingDetails: z.object({
    destinationZip: z.string().optional(),
    destinationCountry: z.string().optional().default("US"),
    estimatedWeight: z.string().optional(),
    packageType: z.enum(["box", "pallet", "envelope"]).optional(),
  }).optional(),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

export const listRFQs = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const { rfqs, total } = await rfqService.listRFQs(page, limit);

  res.json({
    status: "success",
    data: rfqs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getRFQ = asyncHandler(async (req: Request, res: Response) => {
  const rfq = await rfqService.getRFQById(req.params.id);
  res.json({ status: "success", data: rfq });
});

export const createRFQ = asyncHandler(async (req: Request, res: Response) => {
  const validated = createRFQSchema.parse(req.body);
  const rfq = await rfqService.createRFQ(validated);
  res.status(201).json({ status: "success", data: rfq });
});

export const runRFQ = asyncHandler(async (req: Request, res: Response) => {
  const { vendorIds } = z.object({
    vendorIds: z.array(z.string()).optional(),
  }).parse(req.body ?? {});

  const rfq = await rfqService.startRun(req.params.id, vendorIds);

  // Fire agents in background — do NOT await
  rfqService.executeRun(rfq._id.toString(), vendorIds).catch((err) => {
    logger.error("Background RFQ run failed", { rfqId: rfq._id, error: err.message });
  });

  res.json({
    status: "success",
    message: "Agents dispatched",
    data: { rfqId: rfq._id, status: "running" },
  });
});

export const deleteRFQ = asyncHandler(async (req: Request, res: Response) => {
  await rfqService.deleteRFQ(req.params.id);
  res.json({ status: "success", message: "RFQ deleted" });
});

export const cancelRFQ = asyncHandler(async (req: Request, res: Response) => {
  await rfqService.cancelRFQRun(req.params.id);
  res.json({ status: "success", message: "Run cancelled" });
});

export const awardRFQ = asyncHandler(async (req: Request, res: Response) => {
  const { awardedVendorId, awardNotes } = z
    .object({ awardedVendorId: z.string().min(1), awardNotes: z.string().optional() })
    .parse(req.body);
  const rfq = await rfqService.awardRFQ(req.params.id, awardedVendorId, awardNotes);
  res.json({ status: "success", data: rfq });
});
