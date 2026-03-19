import { Schema, model, Document } from "mongoose";
import type { IQuote } from "../types";

export interface IQuoteDocument extends Omit<IQuote, "_id">, Document {}

const quoteSchema = new Schema<IQuoteDocument>(
  {
    rfqId: { type: Schema.Types.ObjectId, ref: "RFQ", required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    agentRunId: { type: Schema.Types.ObjectId, ref: "AgentRun", required: true },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "no_quote"],
      default: "pending",
    },
    price: { type: Number },
    currency: { type: String, default: "USD" },
    unitPrice: { type: Number },
    leadTime: { type: String },
    minimumOrder: { type: Number },
    shippingCost: { type: Number },
    notes: { type: String },
    rawResult: { type: Schema.Types.Mixed },
    errorMessage: { type: String },
    stepsUsed: { type: Number },
    costUsd: { type: Number },
  },
  { timestamps: true }
);

quoteSchema.index({ rfqId: 1, vendorId: 1 });
quoteSchema.index({ rfqId: 1, status: 1 });
quoteSchema.index({ vendorId: 1 });

export const Quote = model<IQuoteDocument>("Quote", quoteSchema);
