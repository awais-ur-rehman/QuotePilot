import { Vendor } from "../models/Vendor.model";
import { NotFoundError } from "../utils/errors";
import type { IVendor, BrowserProfile } from "../types";

export interface CreateVendorDTO {
  name: string;
  website: string;
  quoteUrl: string;
  tags?: string[];
  formInstructions?: string;
  browserProfile?: BrowserProfile;
}

export interface UpdateVendorDTO extends Partial<CreateVendorDTO> {
  isActive?: boolean;
  reliability?: number;
  avgSteps?: number;
}

export async function listVendors(tag?: string): Promise<IVendor[]> {
  const filter = tag ? { tags: tag, isActive: true } : { isActive: true };
  return Vendor.find(filter).sort({ name: 1 }).lean<IVendor[]>();
}

export async function getVendorById(id: string): Promise<IVendor> {
  const vendor = await Vendor.findById(id).lean<IVendor>();
  if (!vendor) throw new NotFoundError("Vendor not found");
  return vendor;
}

export async function createVendor(data: CreateVendorDTO): Promise<IVendor> {
  const vendor = await Vendor.create(data);
  return vendor.toObject() as IVendor;
}

export async function updateVendor(id: string, data: UpdateVendorDTO): Promise<IVendor> {
  const vendor = await Vendor.findByIdAndUpdate(id, data, { new: true }).lean<IVendor>();
  if (!vendor) throw new NotFoundError("Vendor not found");
  return vendor;
}

export async function deleteVendor(id: string): Promise<void> {
  const result = await Vendor.findByIdAndDelete(id);
  if (!result) throw new NotFoundError("Vendor not found");
}

/** Update vendor reliability and avgSteps after a completed run */
export async function updateVendorStats(
  id: string,
  success: boolean,
  stepsUsed: number
): Promise<void> {
  const vendor = await Vendor.findById(id);
  if (!vendor) return;

  // Weighted rolling average for reliability (success rate)
  const weight = 0.1;
  vendor.reliability = Math.round(
    vendor.reliability * (1 - weight) + (success ? 100 : 0) * weight
  );

  // Rolling average for steps
  if (stepsUsed > 0) {
    vendor.avgSteps =
      vendor.avgSteps === 0
        ? stepsUsed
        : Math.round(vendor.avgSteps * (1 - weight) + stepsUsed * weight);
  }

  await vendor.save();
}
