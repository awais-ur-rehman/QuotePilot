import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// GET /api/rfq — list all RFQs (paginated)
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ status: "success", data: [], message: "RFQ routes — Day 2" });
  })
);

// GET /api/rfq/:id — get single RFQ with quotes
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", data: { id: req.params.id } });
  })
);

// POST /api/rfq — create RFQ
router.post(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(201).json({ status: "success", data: {} });
  })
);

// POST /api/rfq/:id/run — trigger agents
router.post(
  "/:id/run",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", message: `Starting agents for RFQ ${req.params.id}` });
  })
);

// DELETE /api/rfq/:id
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", message: `Deleted RFQ ${req.params.id}` });
  })
);

export default router;
