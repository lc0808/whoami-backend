export interface PlayerPairing {
  [playerId: string]: string;
}

/**
 * Generates random pairings with circular shift pattern
 * Ensures each player is paired with exactly one other (not themselves)
 * @param playerIds - Array of player IDs
 * @returns Object mapping each playerId to their target playerId
 * @throws Error if less than 2 players
 */
export function generatePlayerPairings(playerIds: string[]): PlayerPairing {
  if (playerIds.length < 2) {
    throw new Error("Need at least 2 players for pairing");
  }

  if (playerIds.length === 2) {
    return {
      [playerIds[0]]: playerIds[1],
      [playerIds[1]]: playerIds[0],
    };
  }

  const pairings: PlayerPairing = {};
  const shuffledIds = [...playerIds].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledIds.length; i++) {
    const currentId = shuffledIds[i];
    const targetId = shuffledIds[(i + 1) % shuffledIds.length];
    pairings[currentId] = targetId;
  }

  return pairings;
}

export function validatePairings(
  pairings: PlayerPairing,
  playerIds: string[]
): boolean {
  const playerIdSet = new Set(playerIds);

  for (const id of playerIds) {
    if (!pairings[id]) {
      console.error(`❌ Player ${id} has no pairing`);
      return false;
    }
  }

  const pairingKeys = Object.keys(pairings);
  if (pairingKeys.length !== playerIds.length) {
    console.error(
      `❌ Pairing count mismatch: ${pairingKeys.length} vs ${playerIds.length}`
    );
    return false;
  }

  for (const [fromId, toId] of Object.entries(pairings)) {
    if (fromId === toId) {
      console.error(`❌ Player ${fromId} cannot be paired with themselves`);
      return false;
    }
  }

  for (const targetId of Object.values(pairings)) {
    if (!playerIdSet.has(targetId)) {
      console.error(`❌ Invalid target player: ${targetId}`);
      return false;
    }
  }

  const targetCount: { [key: string]: number } = {};
  for (const targetId of Object.values(pairings)) {
    targetCount[targetId] = (targetCount[targetId] || 0) + 1;
  }

  for (const [playerId, count] of Object.entries(targetCount)) {
    if (count !== 1) {
      console.error(
        `❌ Player ${playerId} is target of ${count} people (should be 1)`
      );
      return false;
    }
  }

  return true;
}

export function getPendingPairings(
  pairings: PlayerPairing,
  assignedPlayerIds: Set<string>
): string[] {
  return Object.keys(pairings).filter((id) => !assignedPlayerIds.has(id));
}
