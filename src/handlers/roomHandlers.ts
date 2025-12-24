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
const MAX_PLAYERS = 20;
const RECONNECT_GRACE_PERIOD_MS = Number(
  process.env.RECONNECT_GRACE_PERIOD_MS ?? 60000
);

function addPendingDisconnect(
  socketId: string,
  disconnect: PendingDisconnect
): void {
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

export function setupRoomHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket) => {
    logger.socket(`Client connected: ${socket.id}`);

    const checkAndClearPending = () => {
      const keysToDelete: string[] = [];

      for (const [oldSocketId, pending] of pendingDisconnects) {
        const room = roomManager.getRoom(pending.roomId);
        if (!room) {
          keysToDelete.push(oldSocketId);
          clearTimeout(pending.timeout);
          continue;
        }

        const player = room.players.find((p) => p.id === pending.playerId);
        if (!player) {
          keysToDelete.push(oldSocketId);
          clearTimeout(pending.timeout);
          continue;
        }
      }

      for (const key of keysToDelete) {
        pendingDisconnects.delete(key);
      }
    };

    checkAndClearPending();

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

        if (room.players.length >= MAX_PLAYERS) {
          socket.emit("error", `Room is full (max ${MAX_PLAYERS} players)`);
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

        if (room.gameState !== "waiting") {
          const playerView = GameLogic.getPlayerView(room, playerId);
          socket.emit("game-started", playerView);
          logger.info(`⚡ Resent game-started to rejoined player in ${roomId}`);
        }

        io.to(roomId).emit("room-updated", room);
      } catch (error) {
        logger.error(`Failed to rejoin room: ${error}`);
        socket.emit("error", "Failed to rejoin room");
      }
    });

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
          socket.leave(roomId);
          logger.socket(
            `Player with socket ${socket.id} not found in room ${roomId}`
          );
          return;
        }

        if (room.gameState === "assigning") {
          logger.player(
            `⚠️ Player ${player.name} left during assignment - removing and ending round`
          );

          roomManager.removePlayer(roomId, player.id);
          socket.leave(roomId);

          const updatedRoom = roomManager.getRoom(room.id);
          if (updatedRoom) {
            updatedRoom.gameState = "finished";
            roomManager.updateRoom(room.id, updatedRoom);
            io.to(room.id).emit("player-left", updatedRoom);
            io.to(room.id).emit("round-ended", updatedRoom);
            io.to(room.id).emit("info", {
              message: `${player.name} saiu durante a atribuição. Round encerrado.`,
              reason: "player-left-during-assignment",
            });
          }

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

    socket.on("disconnect", () => {
      logger.socket(`Client disconnected: ${socket.id}`);

      const rooms = roomManager.getAllRooms();
      for (const room of rooms) {
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player) continue;

        const gameState = room.gameState;

        if (gameState === "assigning") {
          logger.player(
            `⚠️ Player ${player.name} disconnected during assignment - removing and ending round`
          );

          roomManager.removePlayer(room.id, player.id);

          const updatedRoom = roomManager.getRoom(room.id);
          if (updatedRoom) {
            updatedRoom.gameState = "finished";
            roomManager.updateRoom(room.id, updatedRoom);

            io.to(room.id).emit("player-left", updatedRoom);
            // Then broadcast round ended
            io.to(room.id).emit("round-ended", updatedRoom);
            io.to(room.id).emit("info", {
              message: `${player.name} desconectou durante a atribuição. Round encerrado.`,
              reason: "player-disconnected-during-assignment",
            });
          }

          continue;
        }

        const shouldWaitForReconnect =
          gameState === "waiting" || gameState === "playing";

        if (!shouldWaitForReconnect) {
          try {
            roomManager.removePlayer(room.id, player.id);
            const updatedRoom = roomManager.getRoom(room.id);
            if (updatedRoom) {
              io.to(room.id).emit("player-left", updatedRoom);
            }
            logger.player(
              `Player ${player.name} removed from finished game in ${room.id}`
            );
          } catch (error) {
            logger.error(`Error removing finished-game player: ${error}`);
          }
          continue;
        }

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
