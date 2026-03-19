import { Schema, model, Document } from "mongoose";
import type { IVendor } from "../types";

export interface IVendorDocument extends Omit<IVendor, "_id">, Document {}

const vendorSchema = new Schema<IVendorDocument>(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String, required: true, trim: true },
    quoteUrl: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, default: "general" },
    formInstructions: { type: String, default: "" },
    browserProfile: { type: String, enum: ["lite", "stealth"], default: "lite" },
    isActive: { type: Boolean, default: true },
    reliability: { type: Number, min: 0, max: 100, default: 100 },
    avgSteps: { type: Number, default: 0 },
  },
  { timestamps: true }
);

vendorSchema.index({ category: 1, isActive: 1 });
vendorSchema.index({ name: "text" });

export const Vendor = model<IVendorDocument>("Vendor", vendorSchema);
