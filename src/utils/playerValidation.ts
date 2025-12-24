import { Room } from "../types/index.js";

export function validatePlayerInRoom(
  room: Room | undefined,
  playerId: string,
  socketId: string
): { valid: boolean; error?: string } {
  if (!room) {
    return { valid: false, error: "Room not found" };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { valid: false, error: "Player not in room" };
  }

  if (player.socketId !== socketId) {
    return {
      valid: false,
      error: "Player session mismatch (reconnected elsewhere?)",
    };
  }

  return { valid: true };
}

export function playerExistsInRoom(
  room: Room | undefined,
  playerId: string
): boolean {
  if (!room) return false;
  return room.players.some((p) => p.id === playerId);
}

export function findPlayerBySocketId(room: Room | undefined, socketId: string) {
  if (!room) return undefined;
  return room.players.find((p) => p.socketId === socketId);
}

export function getConnectedPlayerCount(room: Room | undefined): number {
  if (!room) return 0;
  return room.players.filter((p) => p.socketId && p.socketId.length > 0).length;
}
