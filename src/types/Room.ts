import { GameMode } from "./GameMode.js";
import { PresetCategory } from "./Preset.js";
import { Player, PlayerAssignment } from "./Player.js";

export type GameState = "waiting" | "assigning" | "playing" | "finished";

export interface Room {
  id: string;
  ownerId: string;
  players: Player[];
  gameMode: GameMode;
  presetCategory?: PresetCategory;
  gameState: GameState;
  assignments: PlayerAssignment[];
  pairings?: { [playerId: string]: string };
  roundNumber: number;
  createdAt: Date;
}
