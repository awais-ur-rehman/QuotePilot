import { Request, Response } from "express";
import { z } from "zod";
import * as vendorService from "../services/vendor.service";
import { asyncHandler } from "../middleware/error.middleware";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url(),
  quoteUrl: z.string().url(),
  tags: z.array(z.string()).optional().default([]),
  formInstructions: z.string().optional().default(""),
  browserProfile: z.enum(["lite", "stealth"]).optional().default("lite"),
});

const updateVendorSchema = createVendorSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

// ─── Controllers ──────────────────────────────────────────────────────────────

export const listVendors = asyncHandler(async (req: Request, res: Response) => {
  const tag = req.query.tag as string | undefined;
  const vendors = await vendorService.listVendors(tag);
  res.json({ status: "success", data: vendors });
});

export const getVendor = asyncHandler(async (req: Request, res: Response) => {
  const vendor = await vendorService.getVendorById(req.params.id);
  res.json({ status: "success", data: vendor });
});

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const validated = createVendorSchema.parse(req.body);
  const vendor = await vendorService.createVendor(validated);
  res.status(201).json({ status: "success", data: vendor });
});

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const validated = updateVendorSchema.parse(req.body);
  const vendor = await vendorService.updateVendor(req.params.id, validated);
  res.json({ status: "success", data: vendor });
});

export const deleteVendor = asyncHandler(async (req: Request, res: Response) => {
  await vendorService.deleteVendor(req.params.id);
  res.json({ status: "success", message: "Vendor deleted" });
});
