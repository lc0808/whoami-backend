import { ServerOptions } from "socket.io";

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
};
