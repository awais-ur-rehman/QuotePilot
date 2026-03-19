import { Schema, model, Document, Types } from "mongoose";
import type { IRFQ } from "../types";

export interface IRFQDocument extends Omit<IRFQ, "_id">, Document {}

const rfqSchema = new Schema<IRFQDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    specs: {
      productType: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      dimensions: { type: String },
      material: { type: String },
      color: { type: String },
      customFields: { type: Map, of: String, default: {} },
    },
    contactInfo: {
      companyName: { type: String, required: true },
      contactName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String },
    },
    status: {
      type: String,
      enum: ["draft", "running", "completed", "failed"],
      default: "draft",
    },
    vendorIds: [{ type: Types.ObjectId, ref: "Vendor" }],
  },
  { timestamps: true }
);

rfqSchema.index({ status: 1, createdAt: -1 });

export const RFQ = model<IRFQDocument>("RFQ", rfqSchema);
