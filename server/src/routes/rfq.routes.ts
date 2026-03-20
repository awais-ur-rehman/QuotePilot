import { Router } from "express";
import * as rfqController from "../controllers/rfq.controller";

const router = Router();

router.get("/", rfqController.listRFQs);
router.get("/:id", rfqController.getRFQ);
router.post("/", rfqController.createRFQ);
router.post("/:id/run", rfqController.runRFQ);
router.post("/:id/cancel", rfqController.cancelRFQ);
router.patch("/:id/award", rfqController.awardRFQ);
router.delete("/:id", rfqController.deleteRFQ);

export default router;
