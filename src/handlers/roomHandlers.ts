import { Server, Socket } from "socket.io";
import { RoomManager } from "../models/RoomManager.js";
import { GameLogic } from "../models/GameLogic.js";
import { isValidPlayerName, isValidRoomId } from "../utils/validators.js";
import { logger } from "../utils/logger.js";
import { randomUUID } from "crypto";

/**
 * Stores pending disconnections awaiting reconnection
 */
interface PendingDisconnect {
  roomId: string;
  playerId: string;
  timeout: NodeJS.Timeout;
}

const pendingDisconnects = new Map<string, PendingDisconnect>();
const MAX_PENDING_DISCONNECTS = 1000;
const RECONNECT_GRACE_PERIOD_MS = 10000;

/**
 * Safely adds a pending disconnect entry with cleanup of old entries
 */
function addPendingDisconnect(
  socketId: string,
  disconnect: PendingDisconnect
): void {
  // Cleanup old entries if map is getting too large
  if (pendingDisconnects.size >= MAX_PENDING_DISCONNECTS) {
    const firstKey = pendingDisconnects.keys().next().value;
    if (firstKey) {
      const oldEntry = pendingDisconnects.get(firstKey);
      if (oldEntry) {
        clearTimeout(oldEntry.timeout);
        pendingDisconnects.delete(firstKey);
      }
    }
  }

  pendingDisconnects.set(socketId, disconnect);
}

/**
 * Sets up room-related Socket.io event handlers
 */
export function setupRoomHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket) => {
    logger.socket(`Client connected: ${socket.id}`);

    // Handle reconnection within grace period
    const pending = pendingDisconnects.get(socket.id);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingDisconnects.delete(socket.id);
      logger.socket(`⚡ Reconnected within grace period: ${socket.id}`);
    }

    /**
     * Create a new game room
     */
    socket.on("create-room", (playerName, gameMode, presetCategory) => {
      try {
        if (!isValidPlayerName(playerName)) {
          socket.emit("error", "Invalid player name");
          return;
        }

        if (!["preset", "custom"].includes(gameMode)) {
          socket.emit("error", "Invalid game mode");
          return;
        }

        if (gameMode === "preset" && !presetCategory) {
          socket.emit("error", "Preset category required for preset mode");
          return;
        }

        const playerId = randomUUID();
        const room = roomManager.createRoom(
          playerId,
          playerName,
          gameMode,
          presetCategory
        );

        const player = room.players[0];
        player.socketId = socket.id;

        socket.join(room.id);

        logger.success(
          `Room created: ${room.id} by ${playerName} (${gameMode})`
        );

        socket.emit("room-created", room);
      } catch (error) {
        logger.error(`Failed to create room: ${error}`);
        socket.emit("error", "Failed to create room");
      }
    });

    /**
     * Join an existing game room
     */
    socket.on("join-room", (roomId, playerName) => {
      try {
        if (!isValidRoomId(roomId)) {
          socket.emit("error", "Invalid room code format");
          return;
        }

        if (!isValidPlayerName(playerName)) {
          socket.emit("error", "Invalid player name");
          return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        if (room.gameState !== "waiting") {
          socket.emit("error", "Game already started");
          return;
        }

        const playerId = randomUUID();
        const player = { id: playerId, name: playerName, socketId: socket.id };

        roomManager.addPlayer(roomId, player);
        socket.join(roomId);

        logger.success(`Player ${playerName} joined room ${roomId}`);

        const updatedRoom = roomManager.getRoom(roomId)!;

        socket.emit("room-updated", updatedRoom);
        io.to(roomId).emit("player-joined", updatedRoom);
      } catch (error) {
        logger.error(`Failed to join room: ${error}`);
        socket.emit("error", "Failed to join room");
      }
    });

    /**
     * Rejoin a room after temporary disconnect
     */
    socket.on("rejoin-room", (data: { roomId: string; playerId: string }) => {
      try {
        const { roomId, playerId } = data;

        if (!isValidRoomId(roomId)) {
          socket.emit("error", "Invalid room code format");
          return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        const player = room.players.find((p) => p.id === playerId);
        if (!player) {
          socket.emit("error", "Player not found in room");
          return;
        }

        const oldSocketId = player.socketId;
        player.socketId = socket.id;
        socket.join(roomId);

        // Clean up pending disconnect
        if (oldSocketId && pendingDisconnects.has(oldSocketId)) {
          const pending = pendingDisconnects.get(oldSocketId);
          if (pending) {
            clearTimeout(pending.timeout);
          }
          pendingDisconnects.delete(oldSocketId);
        }

        logger.success(
          `✅ Player ${player.name} rejoined room ${roomId} (socket: ${oldSocketId} → ${socket.id})`
        );

        socket.emit("room-updated", room);

        // Resend game state if game already started
        if (room.gameState !== "waiting") {
          const playerView = GameLogic.getPlayerView(room, playerId);
          socket.emit("game-started", playerView);
          logger.info(
            `⚡ Resent game-started to rejoined player in ${roomId}`
          );
        }

        io.to(roomId).emit("room-updated", room);
      } catch (error) {
        logger.error(`Failed to rejoin room: ${error}`);
        socket.emit("error", "Failed to rejoin room");
      }
    });

    /**
     * Leave a game room
     */
    socket.on("leave-room", (roomId) => {
      try {
        if (!isValidRoomId(roomId)) {
          socket.emit("error", "Invalid room code");
          return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player) {
          socket.emit("error", "Player not in room");
          return;
        }

        roomManager.removePlayer(roomId, player.id);
        socket.leave(roomId);

        const updatedRoom = roomManager.getRoom(roomId);
        if (updatedRoom) {
          io.to(roomId).emit("player-left", updatedRoom);
        }

        logger.success(`Player ${player.name} left room ${roomId}`);
      } catch (error) {
        logger.error(`Failed to leave room: ${error}`);
        socket.emit("error", "Failed to leave room");
      }
    });

    /**
     * Handle client disconnect with grace period for reconnection
     */
    socket.on("disconnect", () => {
      logger.socket(`Client disconnected: ${socket.id}`);

      const rooms = roomManager.getAllRooms();
      for (const room of rooms) {
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player) continue;

        const timeoutId = setTimeout(() => {
          logger.player(
            `⏱️ Grace period expired for ${player.name}, removing from ${room.id}`
          );

          const currentRoom = roomManager.getRoom(room.id);
          if (
            currentRoom &&
            currentRoom.players.find((p) => p.id === player.id)
          ) {
            try {
              roomManager.removePlayer(room.id, player.id);
              const updatedRoom = roomManager.getRoom(room.id);
              if (updatedRoom) {
                io.to(room.id).emit("player-left", updatedRoom);
              }
              logger.player(`Player ${player.name} removed due to timeout`);
            } catch (error) {
              logger.error(`Error removing disconnected player: ${error}`);
            }
          }

          pendingDisconnects.delete(socket.id);
        }, RECONNECT_GRACE_PERIOD_MS);

        addPendingDisconnect(socket.id, {
          roomId: room.id,
          playerId: player.id,
          timeout: timeoutId,
        });

        logger.socket(
          `⏳ Grace period started (${RECONNECT_GRACE_PERIOD_MS}ms) for ${player.name} in ${room.id}`
        );
      }
    });
  });
}
