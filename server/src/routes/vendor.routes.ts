import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

// GET /api/vendors
router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ status: "success", data: [], message: "Vendor routes — Day 2" });
  })
);

// GET /api/vendors/:id
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", data: { id: req.params.id } });
  })
);

// POST /api/vendors
router.post(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(201).json({ status: "success", data: {} });
  })
);

// PUT /api/vendors/:id
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", data: { id: req.params.id } });
  })
);

// DELETE /api/vendors/:id
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "success", message: `Deleted vendor ${req.params.id}` });
  })
);

export default router;
