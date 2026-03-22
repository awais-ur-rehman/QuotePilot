import { Schema, model, Document } from "mongoose";
import type { IDiscoveryRun } from "../types";

export interface IDiscoveryRunDocument extends Omit<IDiscoveryRun, "_id">, Document {}

const discoveryRunSchema = new Schema<IDiscoveryRunDocument>(
  {
    searchQuery: { type: String, required: true },
    source: { type: String, enum: ["google", "thomasnet", "alibaba"], required: true },
    tinyfishRunId: { type: String },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    vendorsFound: [
      {
        name: { type: String, required: true },
        website: { type: String, required: true },
        quoteUrl: { type: String },
        hasOnlineForm: { type: Boolean, default: false },
        category: { type: String },
        addedToRegistry: { type: Boolean, default: false },
      },
    ],
    stepsUsed: { type: Number },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

discoveryRunSchema.index({ status: 1, createdAt: -1 });
discoveryRunSchema.index({ searchQuery: 1 });

export const DiscoveryRun = model<IDiscoveryRunDocument>("DiscoveryRun", discoveryRunSchema);
