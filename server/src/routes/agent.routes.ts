import { Router } from "express";
import * as agentController from "../controllers/agent.controller";

const router = Router();

router.get("/runs/:rfqId", agentController.getAgentRuns);
router.post("/cancel/:runId", agentController.cancelAgent);

export default router;
