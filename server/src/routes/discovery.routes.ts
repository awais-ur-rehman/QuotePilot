import { Router } from "express";
import * as discoveryController from "../controllers/discovery.controller";

const router = Router();

router.post("/search", discoveryController.searchVendors);
router.get("/runs", discoveryController.listRuns);
router.get("/runs/:id", discoveryController.getRun);
router.post("/accept", discoveryController.acceptVendor);

export default router;
