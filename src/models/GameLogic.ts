import { Room } from "../types/index.js";
import { getPresetByCategory } from "../data/presetManager.js";
import { selectRandomItems, shuffleArray } from "../utils/randomizer.js";

/**
 * Game logic and validation rules
 */
export class GameLogic {
  /**
   * Assigns random preset items to all players
   * @param room - The game room
   * @throws Error if preset category not set or not enough items
   */
  static assignPresetItems(room: Room): void {
    if (!room.presetCategory) {
      throw new Error("Preset category not set");
    }

    const presetItems = getPresetByCategory(room.presetCategory);
    if (presetItems.length < room.players.length) {
      throw new Error(
        `Not enough items (${presetItems.length}) for players (${room.players.length})`
      );
    }

    const selectedItems = selectRandomItems(presetItems, room.players.length);
    const shuffledPlayers = shuffleArray(room.players);

    room.assignments = shuffledPlayers.map((player, index) => ({
      playerId: player.id,
      assignedItem: selectedItems[index].name,
    }));
  }

  /**
   * Validates if a custom item assignment is allowed
   * @param room - The game room
   * @param fromPlayerId - Player assigning the item
   * @param toPlayerId - Player receiving the assignment
   */
  static canAssignItem(
    room: Room,
    fromPlayerId: string,
    toPlayerId: string
  ): boolean {
    // Cannot assign to self
    if (fromPlayerId === toPlayerId) {
      return false;
    }

    // Check both players exist
    const playerExists = room.players.some((p) => p.id === fromPlayerId);
    if (!playerExists) {
      return false;
    }

    const targetExists = room.players.some((p) => p.id === toPlayerId);
    if (!targetExists) {
      return false;
    }

    // Target cannot already have assignment
    const alreadyAssigned = room.assignments.some(
      (a) => a.playerId === toPlayerId
    );
    if (alreadyAssigned) {
      return false;
    }

    // Player cannot assign more than once
    const playerAlreadyAssigned = room.assignments.some(
      (a) => "assignedBy" in a && a.assignedBy === fromPlayerId
    );
    if (playerAlreadyAssigned) {
      return false;
    }

    return true;
  }

  /**
   * Checks if all players have been assigned items
   */
  static allPlayersAssigned(room: Room): boolean {
    return room.assignments.length === room.players.length;
  }

  /**
   * Gets the personalized player view (hides own assignment)
   * @param room - The game room
   * @param playerId - The player requesting the view
   */
  static getPlayerView(room: Room, playerId: string) {
    return {
      roomId: room.id,
      roomCode: room.id,
      gameMode: room.gameMode,
      currentRound: room.roundNumber,
      gameState: room.gameState,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        isYou: player.id === playerId,
        isOwner: room.ownerId === player.id,
        assignedItem:
          player.id === playerId
            ? undefined
            : room.assignments.find((a) => a.playerId === player.id)
                ?.assignedItem,
      })),
    };
  }

  /**
   * Validates if game can be started
   * Requires minimum 2 players
   */
  static canStartGame(room: Room): boolean {
    return room.players.length >= 2;
  }
}

export default GameLogic;
