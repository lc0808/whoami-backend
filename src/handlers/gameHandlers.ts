import { Server, Socket } from "socket.io";
import { RoomManager } from "../models/RoomManager.js";
import { GameLogic } from "../models/GameLogic.js";
import {
  isValidRoomId,
  isValidCharacterAssignment,
} from "../utils/validators.js";
import { logger } from "../utils/logger.js";

/**
 * Sets up game-related Socket.io event handlers
 */
export function setupGameHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket) => {
    /**
     * Start the game (owner only)
     */
    socket.on("start-game", (roomId) => {
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
        if (!player || room.ownerId !== player.id) {
          socket.emit("error", "Only room owner can start game");
          return;
        }

        if (!GameLogic.canStartGame(room)) {
          socket.emit("error", "Need at least 2 players to start game");
          return;
        }

        // Assign items for preset mode
        if (room.gameMode === "preset") {
          GameLogic.assignPresetItems(room);
          room.gameState = "playing";
        } else {
          // Custom mode requires manual assignment phase
          room.gameState = "assigning";
        }

        roomManager.updateRoom(roomId, room);
        logger.game(`Game started in room ${roomId}`);

        // Send personalized game view to each player
        for (const p of room.players) {
          io.to(p.socketId).emit(
            "game-started",
            GameLogic.getPlayerView(room, p.id)
          );
        }
      } catch (error) {
        logger.error(`Failed to start game: ${error}`);
        socket.emit("error", "Failed to start game");
      }
    });

    /**
     * Assign a character to a player (custom mode only)
     */
    socket.on("assign-character", (roomId, targetPlayerId, character) => {
      try {
        if (!isValidRoomId(roomId)) {
          socket.emit("error", "Invalid room code");
          return;
        }

        if (!isValidCharacterAssignment(character)) {
          socket.emit("error", "Invalid character (empty or too long)");
          return;
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          socket.emit("error", "Room not found");
          return;
        }

        if (room.gameMode !== "custom") {
          socket.emit(
            "error",
            "Character assignment only allowed in custom mode"
          );
          return;
        }

        const assigningPlayer = room.players.find(
          (p) => p.socketId === socket.id
        );
        if (!assigningPlayer) {
          socket.emit("error", "Player not in room");
          return;
        }

        if (
          !GameLogic.canAssignItem(room, assigningPlayer.id, targetPlayerId)
        ) {
          socket.emit("error", "Invalid target player or already assigned");
          return;
        }

        // Add assignment
        room.assignments.push({
          playerId: targetPlayerId,
          assignedItem: character,
          assignedBy: assigningPlayer.id,
        });

        roomManager.updateRoom(roomId, room);

        logger.game(
          `Character "${character}" assigned to player in room ${roomId} by ${assigningPlayer.name}`
        );

        io.to(roomId).emit("room-updated", room);

        // Start game once all players assigned
        if (GameLogic.allPlayersAssigned(room)) {
          room.gameState = "playing";
          roomManager.updateRoom(roomId, room);

          logger.game(`All players assigned, starting game in room ${roomId}`);

          for (const p of room.players) {
            io.to(p.socketId).emit(
              "game-started",
              GameLogic.getPlayerView(room, p.id)
            );
          }
        }
      } catch (error) {
        logger.error(`Failed to assign character: ${error}`);
        socket.emit("error", "Failed to assign character");
      }
    });

    /**
     * End current round
     */
    socket.on("end-round", (data, callback) => {
      try {
        const { roomId } = data;

        if (!isValidRoomId(roomId)) {
          return callback({ error: "Invalid room code" });
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return callback({ error: "Room not found" });
        }

        if (room.gameState !== "playing") {
          return callback({ error: "Game not in progress" });
        }

        room.gameState = "finished";
        roomManager.updateRoom(roomId, room);

        logger.game(`Round ${room.roundNumber} ended in room ${roomId}`);

        io.to(roomId).emit("round-ended", room);

        callback({ success: true });
      } catch (error) {
        logger.error(`Failed to end round: ${error}`);
        callback({ error: "Failed to end round" });
      }
    });

    /**
     * Start a new round (owner only)
     */
    socket.on("start-new-round", (roomId) => {
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
        if (!player || room.ownerId !== player.id) {
          socket.emit("error", "Only room owner can start new round");
          return;
        }

        // Reset for new round
        room.roundNumber += 1;
        room.assignments = [];
        room.gameState = "waiting";

        roomManager.updateRoom(roomId, room);

        logger.game(`New round ${room.roundNumber} started in room ${roomId}`);

        io.to(roomId).emit("room-updated", room);
        io.to(roomId).emit("round-started", { roundNumber: room.roundNumber });
      } catch (error) {
        logger.error(`Failed to start new round: ${error}`);
        socket.emit("error", "Failed to start new round");
      }
    });
  });
}
