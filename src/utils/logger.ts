/**
 * Logger utility with timestamp and context-aware messages
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  success: (message: string): void => {
    console.log(`[${getTimestamp()}] ✅ ${message}`);
  },
  error: (message: string): void => {
    console.log(`[${getTimestamp()}] ❌ ${message}`);
  },
  player: (message: string): void => {
    console.log(`[${getTimestamp()}] 👤 ${message}`);
  },
  game: (message: string): void => {
    console.log(`[${getTimestamp()}] 🎮 ${message}`);
  },
  room: (message: string): void => {
    console.log(`[${getTimestamp()}] 🏠 ${message}`);
  },
  socket: (message: string): void => {
    console.log(`[${getTimestamp()}] 🔌 ${message}`);
  },
  info: (message: string): void => {
    console.log(`[${getTimestamp()}] ℹ️ ${message}`);
  },
};
