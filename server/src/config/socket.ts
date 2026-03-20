import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "../utils/logger";
import type { AgentStreamEvent } from "../types";

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on("join:rfq", (rfqId: string) => {
      socket.join(`rfq:${rfqId}`);
      logger.info(`Socket ${socket.id} joined rfq:${rfqId}`);
    });

    socket.on("leave:rfq", (rfqId: string) => {
      socket.leave(`rfq:${rfqId}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function broadcastToRFQ(rfqId: string, event: AgentStreamEvent): void {
  if (!io) return;
  io.to(`rfq:${rfqId}`).emit("agent:event", event);
}

export function notifyRFQUpdated(rfqId: string): void {
  if (!io) return;
  io.to(`rfq:${rfqId}`).emit("rfq:updated", { rfqId });
}
