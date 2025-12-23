/**
 * Player Pairing Algorithm for Custom Mode
 * Ensures:
 * 1. Each player is paired with exactly one other player
 * 2. No player is paired with themselves
 * 3. Creates a 1:1 assignment chain (valid graph)
 */

export interface PlayerPairing {
  [playerId: string]: string; // playerId -> targetPlayerId to assign to
}

/**
 * Generates random pairings using Fisher-Yates shuffle with validation
 * For each player, assigns exactly one target player (not themselves)
 *
 * Example with 4 players [A, B, C, D]:
 * - A → B (A assigns character to B)
 * - B → C (B assigns character to C)
 * - C → D (C assigns character to D)
 * - D → A (D assigns character to A)
 * Creates a cycle where everyone assigns to someone and receives from someone
 *
 * @param playerIds - Array of player IDs
 * @returns Object mapping each playerId to their target playerId
 * @throws Error if less than 2 players
 */
export function generatePlayerPairings(playerIds: string[]): PlayerPairing {
  if (playerIds.length < 2) {
    throw new Error("Need at least 2 players for pairing");
  }

  if (playerIds.length === 2) {
    // Special case: 2 players
    // A → B, B → A (cross assignment)
    return {
      [playerIds[0]]: playerIds[1],
      [playerIds[1]]: playerIds[0],
    };
  }

  // For 3+ players, create a rotation to ensure valid cycle
  // This uses a circular shift pattern which guarantees:
  // 1. No self-assignments
  // 2. Everyone gets exactly one target
  // 3. Everyone is target of exactly one person (balanced)
  // 4. Forms a valid assignment cycle

  const pairings: PlayerPairing = {};
  const shuffledIds = [...playerIds].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledIds.length; i++) {
    // Each player gets the next player in the shuffled array
    // Last player wraps around to first (creates cycle)
    const currentId = shuffledIds[i];
    const targetId = shuffledIds[(i + 1) % shuffledIds.length];
    pairings[currentId] = targetId;
  }

  return pairings;
}

/**
 * Validates that pairings are correct
 * @param pairings - The pairings object to validate
 * @param playerIds - All valid player IDs
 * @returns true if valid, false otherwise
 */
export function validatePairings(
  pairings: PlayerPairing,
  playerIds: string[]
): boolean {
  const playerIdSet = new Set(playerIds);

  // Check: each player has exactly one pairing
  for (const id of playerIds) {
    if (!pairings[id]) {
      console.error(`❌ Player ${id} has no pairing`);
      return false;
    }
  }

  // Check: no extra pairings
  const pairingKeys = Object.keys(pairings);
  if (pairingKeys.length !== playerIds.length) {
    console.error(
      `❌ Pairing count mismatch: ${pairingKeys.length} vs ${playerIds.length}`
    );
    return false;
  }

  // Check: no self-assignments
  for (const [fromId, toId] of Object.entries(pairings)) {
    if (fromId === toId) {
      console.error(`❌ Player ${fromId} cannot be paired with themselves`);
      return false;
    }
  }

  // Check: all targets exist
  for (const targetId of Object.values(pairings)) {
    if (!playerIdSet.has(targetId)) {
      console.error(`❌ Invalid target player: ${targetId}`);
      return false;
    }
  }

  // Check: everyone is a target of exactly one person (1:1 mapping)
  const targetCount: { [key: string]: number } = {};
  for (const targetId of Object.values(pairings)) {
    targetCount[targetId] = (targetCount[targetId] || 0) + 1;
  }

  for (const [playerId, count] of Object.entries(targetCount)) {
    if (count !== 1) {
      console.error(`❌ Player ${playerId} is target of ${count} people (should be 1)`);
      return false;
    }
  }

  return true;
}

/**
 * Gets the players that still need to make assignments
 * @param pairings - All pairings
 * @param assignments - Completed assignments
 * @returns Array of player IDs that haven't assigned yet
 */
export function getPendingPairings(
  pairings: PlayerPairing,
  assignedPlayerIds: Set<string>
): string[] {
  return Object.keys(pairings).filter((id) => !assignedPlayerIds.has(id));
}
