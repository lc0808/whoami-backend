import { RoomManager } from "../models/RoomManager.js";
import { logger } from "../utils/logger.js";

export class CleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly interval: number;

  constructor(interval: number = 60000) {
    this.interval = interval;
  }

  start(roomManager: RoomManager): void {
    this.intervalId = setInterval(() => {
      const rooms = roomManager.getAllRooms();
      let cleanedCount = 0;

      for (const room of rooms) {
        if (room.players.length === 0) {
          roomManager.deleteRoom(room.id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleanup: Removed ${cleanedCount} empty rooms`);
      }
    }, this.interval);

    logger.info(`Cleanup service started (interval: ${this.interval}ms)`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      logger.info("Cleanup service stopped");
    }
  }
}

export default new CleanupService();
