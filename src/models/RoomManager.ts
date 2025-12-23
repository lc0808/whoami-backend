import { Room, Player } from "../types/index.js";
import { generateRoomId } from "../utils/generateRoomId.js";
import { logger } from "../utils/logger.js";
import { GameMode, PresetCategory } from "../types/index.js";

/**
 * In-memory room management with CRUD operations
 */
export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  /**
   * Creates a new game room
   * @param ownerId - ID of the room owner
   * @param ownerName - Name of the room owner
   * @param gameMode - Game mode (preset or custom)
   * @param presetCategory - Optional preset category for preset mode
   */
  createRoom(
    ownerId: string,
    ownerName: string,
    gameMode: GameMode,
    presetCategory?: PresetCategory
  ): Room {
    const roomId = generateRoomId();

    const room: Room = {
      id: roomId,
      ownerId,
      players: [
        {
          id: ownerId,
          name: ownerName,
          socketId: "",
        },
      ],
      gameMode,
      presetCategory,
      gameState: "waiting",
      assignments: [],
      roundNumber: 1,
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    logger.room(`Created room ${roomId}`);
    return room;
  }

  /**
   * Retrieves a room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Adds a player to a room
   * @throws Error if room not found or player already exists
   */
  addPlayer(roomId: string, player: Player): Room {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    if (room.players.some((p) => p.id === player.id)) {
      throw new Error(`Player ${player.id} already in room`);
    }

    room.players.push(player);
    logger.player(`Player ${player.name} joined room ${roomId}`);
    return room;
  }

  /**
   * Removes a player from a room
   * Transfers ownership if removed player was owner
   * @throws Error if room or player not found
   */
  removePlayer(roomId: string, playerId: string): Room {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error(`Player ${playerId} not in room`);
    }

    const playerName = room.players[playerIndex].name;
    room.players.splice(playerIndex, 1);
    logger.player(`Player ${playerName} left room ${roomId}`);

    // Transfer ownership to first remaining player
    if (room.ownerId === playerId && room.players.length > 0) {
      room.ownerId = room.players[0].id;
      logger.room(`Ownership transferred to ${room.players[0].name}`);
    }

    // Delete room if empty
    if (room.players.length === 0) {
      this.deleteRoom(roomId);
    }

    return room;
  }

  /**
   * Updates room properties
   * @throws Error if room not found
   */
  updateRoom(roomId: string, updates: Partial<Room>): Room {
    const room = this.getRoom(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    Object.assign(room, updates);
    return room;
  }

  /**
   * Deletes a room
   */
  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    logger.room(`Room ${roomId} deleted`);
  }

  /**
   * Gets all active rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Gets total number of active rooms
   */
  getRoomCount(): number {
    return this.rooms.size;
  }
}
