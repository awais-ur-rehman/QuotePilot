import { Schema, model, Document } from "mongoose";
import type { IAgentRun } from "../types";

export interface IAgentRunDocument extends Omit<IAgentRun, "_id">, Document {}

const agentRunSchema = new Schema<IAgentRunDocument>(
  {
    rfqId: { type: Schema.Types.ObjectId, ref: "RFQ", required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    quoteId: { type: Schema.Types.ObjectId, ref: "Quote", required: true },
    tinyfishRunId: { type: String },
    streamingUrl: { type: String },
    status: {
      type: String,
      enum: ["queued", "started", "running", "completed", "failed", "cancelled"],
      default: "queued",
    },
    events: [
      {
        type: { type: String, required: true },
        data: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

agentRunSchema.index({ rfqId: 1, status: 1 });
agentRunSchema.index({ vendorId: 1 });
agentRunSchema.index({ tinyfishRunId: 1 });

export const AgentRun = model<IAgentRunDocument>("AgentRun", agentRunSchema);
