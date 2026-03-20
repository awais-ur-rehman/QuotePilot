import { Request, Response } from "express";
import { RFQ } from "../models/RFQ.model";
import { Quote } from "../models/Quote.model";
import { Vendor } from "../models/Vendor.model";
import { asyncHandler } from "../middleware/error.middleware";

export const getAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalRFQs,
    totalQuotes,
    completedQuotes,
    recentRFQs,
    vendorStats,
  ] = await Promise.all([
    RFQ.countDocuments(),
    Quote.countDocuments(),
    Quote.countDocuments({ status: "completed" }),

    // Last 10 completed/awarded RFQs
    RFQ.find({ status: { $in: ["completed", "awarded"] } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),

    // Per-vendor quote stats
    Quote.aggregate([
      {
        $group: {
          _id: "$vendorId",
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          avgUnitPrice: { $avg: "$unitPrice" },
          minUnitPrice: { $min: "$unitPrice" },
          avgSteps: { $avg: "$stepsUsed" },
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "_id",
          foreignField: "_id",
          as: "vendor",
        },
      },
      { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
      { $sort: { completed: -1 } },
    ]),
  ]);

  const successRate = totalQuotes > 0
    ? Math.round((completedQuotes / totalQuotes) * 100)
    : 0;

  // Estimate hours saved: each completed quote ≈ 45 min manual work
  const hoursSaved = Math.round((completedQuotes * 45) / 60);

  res.json({
    status: "success",
    data: {
      summary: {
        totalRFQs,
        totalQuotes,
        completedQuotes,
        successRate,
        hoursSaved,
      },
      vendorStats: vendorStats.map((v) => ({
        vendorId: String(v._id),
        vendorName: v.vendor?.name ?? "Unknown",
        total: v.total,
        completed: v.completed,
        successRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
        avgUnitPrice: v.avgUnitPrice ?? null,
        minUnitPrice: v.minUnitPrice ?? null,
        avgSteps: v.avgSteps ? Math.round(v.avgSteps) : null,
      })),
      recentRFQs,
    },
  });
});
