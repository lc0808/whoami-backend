import { ServerOptions } from "socket.io";

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT ?? 60000), // default 60s
  pingInterval: Number(process.env.SOCKET_PING_INTERVAL ?? 25000), // default 25s
};
