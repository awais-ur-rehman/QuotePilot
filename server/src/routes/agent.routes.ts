import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// GET /api/agent/runs/:rfqId — get all agent runs for an RFQ
router.get(
  "/runs/:rfqId",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", data: [], rfqId: req.params.rfqId });
  })
);

// GET /api/agent/stream/:rfqId — SSE bridge endpoint
// This will be fully implemented Day 2 — client connects here to get live events
router.get("/stream/:rfqId", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send a connected confirmation
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", rfqId: req.params.rfqId })}\n\n`);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

// POST /api/agent/cancel/:runId — cancel a running agent
router.post(
  "/cancel/:runId",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", message: `Cancelling run ${req.params.runId}` });
  })
);

export default router;
