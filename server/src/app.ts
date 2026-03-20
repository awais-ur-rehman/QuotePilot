import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import { env } from "./config/env";
import { connectDB } from "./config/db";
import { initSocket } from "./config/socket";
import { errorMiddleware } from "./middleware/error.middleware";
import { logger } from "./utils/logger";

import rfqRoutes from "./routes/rfq.routes";
import vendorRoutes from "./routes/vendor.routes";
import agentRoutes from "./routes/agent.routes";
import analyticsRoutes from "./routes/analytics.routes";

const app = express();
const httpServer = http.createServer(app);

// ─── Security & utility middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.NODE_ENV === "production" ? false : "*" }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "quotepilot-server", env: env.NODE_ENV });
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api/rfq", rfqRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/analytics", analyticsRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap() {
  await connectDB();
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 QuotePilot server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`   Health: http://localhost:${env.PORT}/health`);
    logger.info(`   API:    http://localhost:${env.PORT}/api`);
    logger.info(`   Socket: ws://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", err);
  process.exit(1);
});

export { app };
