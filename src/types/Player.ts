export interface Player {
  id: string;
  name: string;
  socketId: string;
}

export interface PlayerAssignment {
  playerId: string;
  assignedItem: string;
  assignedBy?: string;
}
