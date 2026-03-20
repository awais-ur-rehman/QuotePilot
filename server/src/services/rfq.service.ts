import { Types } from "mongoose";
import { RFQ } from "../models/RFQ.model";
import { Vendor } from "../models/Vendor.model";
import { Quote } from "../models/Quote.model";
import { AgentRun } from "../models/AgentRun.model";
import { runSSE } from "./tinyfish.service";
import { buildGoal } from "./goal-builder.service";
import { updateVendorStats } from "./vendor.service";
import { broadcastToRFQ, notifyRFQUpdated } from "../config/socket";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { logger } from "../utils/logger";
import type { IRFQ, IVendor, ExtractedQuote, AgentStreamEvent } from "../types";

export interface CreateRFQDTO {
  title: string;
  description?: string;
  specs: {
    productType: string;
    quantity: number;
    dimensions?: string;
    material?: string;
    color?: string;
    customFields?: Record<string, string>;
  };
  contactInfo: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
  };
  vendorIds: string[];
}

export async function listRFQs(
  page = 1,
  limit = 20
): Promise<{ rfqs: IRFQ[]; total: number }> {
  const skip = (page - 1) * limit;
  const [rfqs, total] = await Promise.all([
    RFQ.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IRFQ[]>(),
    RFQ.countDocuments(),
  ]);
  return { rfqs, total };
}

export async function getRFQById(id: string): Promise<IRFQ & { quotes: unknown[] }> {
  const rfq = await RFQ.findById(id).lean<IRFQ>();
  if (!rfq) throw new NotFoundError("RFQ not found");

  const quotes = await Quote.find({ rfqId: id })
    .populate("vendorId", "name website category")
    .lean();

  return { ...rfq, quotes };
}

export async function createRFQ(data: CreateRFQDTO): Promise<IRFQ> {
  // Validate vendor IDs exist
  const vendorCount = await Vendor.countDocuments({
    _id: { $in: data.vendorIds },
    isActive: true,
  });
  if (vendorCount !== data.vendorIds.length) {
    throw new BadRequestError("One or more vendor IDs are invalid or inactive");
  }

  const rfq = await RFQ.create({
    ...data,
    specs: { ...data.specs, customFields: data.specs.customFields ?? {} },
  });
  return rfq.toObject() as IRFQ;
}

export async function deleteRFQ(id: string): Promise<void> {
  const rfq = await RFQ.findById(id);
  if (!rfq) throw new NotFoundError("RFQ not found");
  if (rfq.status === "running") {
    throw new BadRequestError("Cannot delete a running RFQ. Cancel it first.");
  }
  await Promise.all([
    RFQ.deleteOne({ _id: id }),
    Quote.deleteMany({ rfqId: id }),
    AgentRun.deleteMany({ rfqId: id }),
  ]);
}

/** Validates and marks RFQ as starting. Returns the RFQ. */
export async function startRun(rfqId: string): Promise<IRFQ> {
  const rfq = await RFQ.findById(rfqId).lean<IRFQ>();
  if (!rfq) throw new NotFoundError("RFQ not found");
  if (rfq.status === "running") {
    throw new BadRequestError("RFQ is already running");
  }
  if (!rfq.vendorIds || rfq.vendorIds.length === 0) {
    throw new BadRequestError("RFQ has no vendors selected");
  }

  await RFQ.findByIdAndUpdate(rfqId, { status: "running" });
  return { ...rfq, status: "running" };
}

/**
 * Core execution — runs all vendor agents concurrently.
 * Call this fire-and-forget (do NOT await in route handler).
 */
export async function executeRun(rfqId: string): Promise<void> {
  const rfq = await RFQ.findById(rfqId).lean<IRFQ>();
  if (!rfq) return;

  const vendors = await Vendor.find({
    _id: { $in: rfq.vendorIds },
    isActive: true,
  }).lean<IVendor[]>();

  if (vendors.length === 0) {
    await RFQ.findByIdAndUpdate(rfqId, { status: "failed" });
    return;
  }

  // Create Quote + AgentRun pairs for each vendor (pre-generate IDs to avoid circular dep)
  const entries = await Promise.all(
    vendors.map(async (vendor) => {
      const agentRunId = new Types.ObjectId();
      const quoteId = new Types.ObjectId();

      const [quote, agentRun] = await Promise.all([
        Quote.create({
          _id: quoteId,
          rfqId,
          vendorId: vendor._id,
          agentRunId,
          status: "pending",
        }),
        AgentRun.create({
          _id: agentRunId,
          rfqId,
          vendorId: vendor._id,
          quoteId,
          status: "queued",
        }),
      ]);

      return { vendor, quote, agentRun };
    })
  );

  // Broadcast that we're starting
  broadcastToRFQ(rfqId, {
    rfqId,
    vendorId: "",
    vendorName: "System",
    type: "STARTED",
    data: { vendorCount: vendors.length },
    timestamp: new Date().toISOString(),
  });

  // Run all vendor agents concurrently — use allSettled so one failure doesn't block others
  const tasks = entries.map(({ vendor, quote, agentRun }) =>
    runVendorAgent(rfq, vendor, quote, agentRun)
  );
  await Promise.allSettled(tasks);

  // Update final RFQ status
  const finalQuotes = await Quote.find({ rfqId }).lean();
  const anyCompleted = finalQuotes.some((q) => q.status === "completed");
  const allSettled = finalQuotes.every((q) =>
    ["completed", "failed", "no_quote"].includes(q.status as string)
  );

  const finalStatus = allSettled
    ? anyCompleted
      ? "completed"
      : "failed"
    : "completed";

  await RFQ.findByIdAndUpdate(rfqId, { status: finalStatus });
  notifyRFQUpdated(rfqId);

  broadcastToRFQ(rfqId, {
    rfqId,
    vendorId: "",
    vendorName: "System",
    type: "COMPLETE",
    data: { status: finalStatus, quotesCollected: finalQuotes.filter((q) => q.status === "completed").length },
    timestamp: new Date().toISOString(),
  });

  logger.info(`RFQ ${rfqId} run completed. Status: ${finalStatus}`);
}

async function runVendorAgent(
  rfq: IRFQ,
  vendor: IVendor,
  quote: InstanceType<typeof Quote>,
  agentRun: InstanceType<typeof AgentRun>
): Promise<void> {
  const rfqId = rfq._id.toString();
  const vendorId = vendor._id.toString();

  const emit = (event: AgentStreamEvent) => broadcastToRFQ(rfqId, event);

  const goal = buildGoal(vendor, rfq);

  await Quote.findByIdAndUpdate(quote._id, { status: "running" });
  await AgentRun.findByIdAndUpdate(agentRun._id, {
    status: "started",
    startedAt: new Date(),
  });

  let stepsUsed = 0;

  try {
    for await (const event of runSSE({
      url: vendor.quoteUrl,
      goal,
      browserProfile: vendor.browserProfile,
    })) {
      stepsUsed++;

      // Push event to AgentRun log
      await AgentRun.findByIdAndUpdate(agentRun._id, {
        $push: { events: { type: event.type, data: event, timestamp: new Date() } },
      });

      // Handle specific event types
      if (event.type === "STARTED") {
        await AgentRun.findByIdAndUpdate(agentRun._id, {
          tinyfishRunId: event.runId,
          status: "running",
        });
        emit({
          rfqId, vendorId, vendorName: vendor.name, type: "STARTED",
          data: { runId: event.runId }, timestamp: new Date().toISOString(),
        });
      } else if (event.type === "STREAMING_URL") {
        await AgentRun.findByIdAndUpdate(agentRun._id, {
          streamingUrl: event.streamingUrl,
        });
        emit({
          rfqId, vendorId, vendorName: vendor.name, type: "STREAMING_URL",
          data: { streamingUrl: event.streamingUrl }, timestamp: new Date().toISOString(),
        });
      } else if (event.type === "PROGRESS") {
        emit({
          rfqId, vendorId, vendorName: vendor.name, type: "PROGRESS",
          data: { purpose: event.purpose }, timestamp: new Date().toISOString(),
        });
      } else if (event.type === "HEARTBEAT") {
        emit({
          rfqId, vendorId, vendorName: vendor.name, type: "HEARTBEAT",
          data: {}, timestamp: new Date().toISOString(),
        });
      } else if (event.type === "COMPLETE") {
        const costUsd = stepsUsed * 0.013; // ~$0.013/step

        if (event.status === "COMPLETED" && event.resultJson) {
          const extracted = event.resultJson as ExtractedQuote;
          await Quote.findByIdAndUpdate(quote._id, {
            status: extracted.submitted === false ? "no_quote" : "completed",
            price: extracted.price ?? undefined,
            currency: extracted.currency ?? "USD",
            unitPrice: extracted.unitPrice ?? undefined,
            leadTime: extracted.leadTime ?? undefined,
            minimumOrder: extracted.minimumOrder ?? undefined,
            shippingCost: extracted.shippingCost ?? undefined,
            notes: extracted.notes ?? undefined,
            rawResult: extracted,
            stepsUsed,
            costUsd,
          });
        } else {
          await Quote.findByIdAndUpdate(quote._id, {
            status: "failed",
            errorMessage: event.error?.message ?? "TinyFish run failed",
            stepsUsed,
            costUsd,
          });
        }

        await AgentRun.findByIdAndUpdate(agentRun._id, {
          status: "completed",
          completedAt: new Date(),
        });

        await updateVendorStats(vendorId, event.status === "COMPLETED", stepsUsed);

        emit({
          rfqId, vendorId, vendorName: vendor.name, type: "COMPLETE",
          data: { status: event.status, resultJson: event.resultJson, error: event.error },
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Vendor agent failed for ${vendor.name}`, { error: errorMessage, rfqId, vendorId });

    await Quote.findByIdAndUpdate(quote._id, {
      status: "failed",
      errorMessage,
      stepsUsed,
      costUsd: stepsUsed * 0.013,
    });
    await AgentRun.findByIdAndUpdate(agentRun._id, {
      status: "failed",
      completedAt: new Date(),
    });

    await updateVendorStats(vendorId, false, stepsUsed);

    emit({
      rfqId, vendorId, vendorName: vendor.name, type: "ERROR",
      data: { error: errorMessage }, timestamp: new Date().toISOString(),
    });
  }
}
