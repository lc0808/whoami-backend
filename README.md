# Quem Sou Eu? - Backend

Real-time multiplayer guessing game backend built with Node.js, TypeScript, Express.js, and Socket.io.

## 📋 Overview

A scalable, type-safe backend for a real-time multiplayer game where players guess assigned characters or items. Supports both preset mode (system-assigned) and custom mode (player-assigned) gameplay.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

The server will run on `http://localhost:3000`

## 📁 Project Structure

```
src/
├── types/                 # TypeScript type definitions
│   ├── Room.ts
│   ├── Player.ts
│   ├── GameMode.ts
│   ├── Preset.ts
│   └── index.ts
├── data/                  # Preset data
│   ├── presets/
│   │   ├── animals.ts
│   │   ├── celebrities.ts
│   │   ├── foods.ts
│   │   ├── movies.ts
│   │   ├── countries.ts
│   │   └── index.ts
│   └── presetManager.ts
├── models/                # Core logic
│   ├── RoomManager.ts     # Room CRUD operations
│   ├── GameLogic.ts       # Game rules & validation
│   └── index.ts
├── handlers/              # Socket.io event handlers
│   ├── roomHandlers.ts
│   ├── gameHandlers.ts
│   └── index.ts
├── services/              # Background services
│   └── cleanupService.ts
├── utils/                 # Utility functions
│   ├── generateRoomId.ts
│   ├── validators.ts
│   ├── randomizer.ts
│   └── logger.ts
├── config/                # Configuration
│   └── socket.config.ts
└── server.ts             # Entry point
```

## 🎮 Game Features

### Room Management

- ✅ Create rooms with unique 6-character codes
- ✅ Join existing rooms by code
- ✅ Real-time player list updates
- ✅ Automatic ownership transfer
- ✅ Auto-cleanup of empty rooms

### Game Modes

- **Preset Mode**: System assigns items from selected category
- **Custom Mode**: Players manually assign items to each other

### Gameplay

- ✅ Multiple game states (waiting, in-progress, round-ended)
- ✅ Personalized player views (hidden own assignment)
- ✅ Multi-round support
- ✅ Ownership-based game control

## 📡 Socket.io Events

### Client → Server

#### Room Events

```javascript
// Create a new room
socket.emit(
  "create-room",
  {
    playerName: "John",
    gameMode: "preset", // 'preset' or 'custom'
    presetCategory: "animals", // animals, celebrities, foods, movies, countries
  },
  (response) => {
    // response: { room: {...} } or { error: '...' }
  }
);

// Join existing room
socket.emit(
  "join-room",
  {
    roomId: "A3X9K2",
    playerName: "Jane",
  },
  (response) => {
    // response: { room: {...} } or { error: '...' }
  }
);

// Leave room
socket.emit(
  "leave-room",
  {
    roomId: "A3X9K2",
  },
  (response) => {
    // response: { success: true } or { error: '...' }
  }
);
```

#### Game Events

```javascript
// Start game (owner only)
socket.emit(
  "start-game",
  {
    roomId: "A3X9K2",
  },
  (response) => {
    // response: { success: true } or { error: '...' }
  }
);

// Assign character to player (custom mode only)
socket.emit(
  "assign-character",
  {
    roomId: "A3X9K2",
    targetPlayerId: "player-uuid",
    character: "Batman",
  },
  (response) => {
    // response: { success: true } or { error: '...' }
  }
);

// End current round
socket.emit(
  "end-round",
  {
    roomId: "A3X9K2",
  },
  (response) => {
    // response: { success: true } or { error: '...' }
  }
);

// Start new round (owner only)
socket.emit(
  "start-new-round",
  {
    roomId: "A3X9K2",
  },
  (response) => {
    // response: { success: true } or { error: '...' }
  }
);
```

### Server → Client

```javascript
// Room created
socket.on("room-created", (data) => {
  // data: { room: {...} }
});

// Room updated
socket.on("room-updated", (data) => {
  // data: { room: {...} }
});

// Player joined
socket.on("player-joined", (data) => {
  // data: { room: {...} }
});

// Player left
socket.on("player-left", (data) => {
  // data: { room: {...} }
});

// Game started (personalized per player)
socket.on("game-started", (data) => {
  // data: { playerView: { roomId, gameMode, players[{id, name, isYou, assignedItem}], ... } }
});

// Round ended
socket.on("round-ended", (data) => {
  // data: { room: { id, roundNumber, state } }
});
```

## 🔧 Core Classes

### RoomManager

In-memory room management with CRUD operations.

```typescript
// Create room
const room = roomManager.createRoom(
  ownerId,
  ownerName,
  gameMode,
  presetCategory
);

// Get room
const room = roomManager.getRoom(roomId);

// Add player
roomManager.addPlayer(roomId, player);

// Remove player
roomManager.removePlayer(roomId, playerId);

// Update room
roomManager.updateRoom(roomId, updates);

// Delete room
roomManager.deleteRoom(roomId);

// Get all rooms
const rooms = roomManager.getAllRooms();

// Get room count
const count = roomManager.getRoomCount();
```

### GameLogic

Static game rule validation and logic.

```typescript
// Assign preset items
GameLogic.assignPresetItems(room);

// Check custom assignment validity
const isValid = GameLogic.canAssignItem(room, fromId, toId);

// Check if all players assigned
const ready = GameLogic.allPlayersAssigned(room);

// Get player view (hides own assignment)
const view = GameLogic.getPlayerView(room, playerId);

// Check if game can start
const canStart = GameLogic.canStartGame(room);
```

## 🛠 Utilities

### Validators

```typescript
isValidRoomId(roomId); // 6 alphanumeric chars
isValidPlayerName(name); // 1-30 characters
isValidCharacterAssignment(char); // 1-50 characters
```

### Randomizer

```typescript
selectRandomItems(items, count); // Select N unique items
getRandomItem(items); // Get single random item
shuffleArray(array); // Fisher-Yates shuffle
```

### Logger

```typescript
logger.success(msg); // ✅
logger.error(msg); // ❌
logger.player(msg); // 👤
logger.game(msg); // 🎮
logger.room(msg); // 🏠
logger.socket(msg); // 🔌
logger.info(msg); // ℹ️
```

## 📊 Data Types

### Room

```typescript
interface Room {
  id: string; // 6-char room code
  ownerId: string; // UUID of room owner
  players: Player[];
  gameMode: "preset" | "custom";
  presetCategory?: PresetCategory; // For preset mode
  state: "waiting" | "in-progress" | "round-ended";
  assignments: PlayerAssignment[]; // { playerId, assignedItem }
  roundNumber: number;
  createdAt: Date;
}
```

### Player

```typescript
interface Player {
  id: string; // UUID
  name: string;
  socketId: string;
}
```

### PresetItem

```typescript
interface PresetItem {
  id: string;
  name: string;
  difficulty?: "easy" | "medium" | "hard";
}
```

## 🌍 Preset Categories

- **Animals**: 50+ animal names
- **Celebrities**: 50+ famous people
- **Foods**: 50+ food items
- **Movies**: 50+ movie titles
- **Countries**: 50+ country names

Each category is easily extensible.

## 🔄 Cleanup Service

Automatically removes empty rooms every 60 seconds (configurable).

```typescript
cleanupService.start(roomManager); // Start cleanup
cleanupService.stop(); // Stop cleanup
```

## 📝 npm Scripts

```bash
npm run dev       # Start with hot-reload (tsx watch)
npm run build     # Compile TypeScript to dist/
npm start         # Run compiled JavaScript
npm run lint      # Check code quality
npm run format    # Format code with Prettier
```

## 🔗 API Routes

```
GET /health    # Health check with room count
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-12-19T10:30:00.000Z",
  "rooms": 5
}
```

## ⚙️ Environment Variables

```env
PORT=3000                           # Server port
CORS_ORIGIN=http://localhost:5173   # Allowed origin(s). Comma-separated for multiple.
NODE_ENV=development                # development or production
CLEANUP_INTERVAL=60000              # Room cleanup interval (ms)
```

## 🎯 Type Safety

- ✅ Strict TypeScript mode enabled
- ✅ No `any` types allowed
- ✅ All functions have explicit return types
- ✅ Full type coverage across all modules

## 🧪 Testing Tips

### Create Room

```javascript
socket.emit("create-room", {
  playerName: "Player1",
  gameMode: "preset",
  presetCategory: "animals",
});
```

### Join Room

```javascript
socket.emit("join-room", {
  roomId: "A3X9K2",
  playerName: "Player2",
});
```

### Start Preset Game

```javascript
socket.emit("start-game", { roomId: "A3X9K2" });
// Each player receives personalized view with everyone's items except their own
```

### Custom Mode Workflow

1. Create room in custom mode
2. Players join
3. Each player assigns a character to another player
4. Once all assigned, owner can start game

## 🚀 Production Deployment

1. Build the project:

   ```bash
   npm run build
   ```

2. Set environment variables:

   ```bash
   export NODE_ENV=production
   export PORT=3000
   export CORS_ORIGIN=https://yourdomain.com
   ```

3. Start server:
   ```bash
   npm start
   ```

## 🐛 Debugging

Enable verbose logging by checking console output. All events are logged with emojis for quick identification:

- ✅ Success operations
- ❌ Error operations
- 👤 Player events
- 🎮 Game events
- 🏠 Room events
- 🔌 Socket events
- ℹ️ Info messages

## 📚 Technologies Used

- **Express.js**: Web server framework
- **Socket.io**: Real-time bidirectional communication
- **TypeScript**: Static type checking
- **Node.js**: JavaScript runtime
- **ESLint**: Code quality
- **Prettier**: Code formatting

## 👤 Author

**Lucas Carvalho**

- Portfolio: [under construction]
- LinkedIn: [linkedin.com/in/lucas-carvalho-32aa70227](https://linkedin.com/in/lucas-carvalho-32aa70227)
- GitHub: [@lc0808](https://github.com/lc0808)
- Email: lucasvieirac.dev@gmail.com

## 📄 License

This project was developed for educational and portfolio purposes.

---

**Ready to play? Connect and start creating rooms! 🎮**
