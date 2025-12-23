export function isValidRoomId(roomId: string): boolean {
  return /^[A-Z0-9]{6}$/.test(roomId);
}

export function isValidPlayerName(name: string): boolean {
  return name.trim().length > 0 && name.length <= 30;
}

export function isValidCharacterAssignment(character: string): boolean {
  return character.trim().length > 0 && character.length <= 50;
}
