import { Server as HttpServer } from "http";
import { Server } from "socket.io";

let socketServer: Server;

export const useSocketMiddleware = (server: HttpServer) => {
  socketServer = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  socketServer.on("connection", async (socket) => {
    console.log("socket connected");
  });
};

export { socketServer };
