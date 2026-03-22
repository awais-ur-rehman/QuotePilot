import { Schema, model, Document } from "mongoose";
import type { IVendor } from "../types";

export interface IVendorDocument extends Omit<IVendor, "_id">, Document {}

const vendorSchema = new Schema<IVendorDocument>(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String, required: true, trim: true },
    quoteUrl: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    formInstructions: { type: String, default: "" },
    browserProfile: { type: String, enum: ["lite", "stealth"], default: "lite" },
    isActive: { type: Boolean, default: true },
    reliability: { type: Number, min: 0, max: 100, default: 100 },
    avgSteps: { type: Number, default: 0 },
    discoveredFrom: { type: String },
    discoveredAt: { type: Date },
    trustScore: { type: Number, min: 0, max: 100 },
    trustData: {
      bbbRating: { type: String },
      bbbAccredited: { type: Boolean },
      bbbComplaints: { type: Number },
      trustpilotScore: { type: Number },
      trustpilotReviews: { type: Number },
      googleRating: { type: Number },
      googleReviews: { type: Number },
      yearsInBusiness: { type: Number },
      lastChecked: { type: Date },
    },
    trustStatus: {
      type: String,
      enum: ["pending", "checking", "scored", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

vendorSchema.index({ tags: 1, isActive: 1 });
vendorSchema.index({ name: "text" });
vendorSchema.index({ trustStatus: 1 });
vendorSchema.index({ discoveredFrom: 1 });

export const Vendor = model<IVendorDocument>("Vendor", vendorSchema);
