import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { config } from "dotenv";
import { RoomManager } from "./models/RoomManager.js";
import { setupRoomHandlers, setupGameHandlers } from "./handlers/index.js";
import { socketConfig } from "./config/socket.config.js";
import cleanupService from "./services/cleanupService.js";
import { logger } from "./utils/logger.js";

config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, socketConfig);
const roomManager = new RoomManager();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    rooms: roomManager.getRoomCount(),
  });
});

setupRoomHandlers(io, roomManager);
setupGameHandlers(io, roomManager);

cleanupService.start(roomManager);

httpServer.listen(PORT, () => {
  logger.success(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(
    `CORS origin: ${process.env.CORS_ORIGIN || "http://localhost:5173"}`
  );
  logger.info(`Node environment: ${process.env.NODE_ENV || "development"}`);
});

process.on("SIGINT", () => {
  logger.info("Shutting down gracefully...");
  cleanupService.stop();
  httpServer.close(() => {
    logger.success("Server closed");
    process.exit(0);
  });
});
