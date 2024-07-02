// server/api/socket.js

import { Server } from "socket.io";

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      cors: {
        origin: "https://planning-poker-pointing.vercel.app",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log("A user connected");

      socket.on("createSession", (callback) => {
        const sessionId = generateSessionId();
        sessions[sessionId] = { users: [], estimates: [] };
        socket.join(sessionId);
        callback(sessionId);
      });

      socket.on("joinSession", ({ sessionId, userName }, callback) => {
        const session = sessions[sessionId];
        if (session) {
          if (!session.users.some((user) => user.name === userName)) {
            session.users.push({ id: socket.id, name: userName });
            socket.join(sessionId);
            callback({ success: true });
            io.to(sessionId).emit("updateUsers", session.users);
          } else {
            callback({
              success: false,
              message: "Username already taken in this session.",
            });
          }
        } else {
          callback({ success: false, message: "Session not found." });
        }
      });

      socket.on("sendEstimate", ({ sessionId, estimate, userName }) => {
        const session = sessions[sessionId];
        if (session) {
          session.estimates.push({ userName, estimate });
          io.to(sessionId).emit("receiveEstimate", { userName, estimate });
        }
      });

      socket.on("revealCards", (sessionId) => {
        console.log("revealCards event triggered");
        const session = sessions[sessionId];
        if (session) {
          io.to(sessionId).emit("revealCards");
        }
      });

      socket.on("resetVote", (sessionId) => {
        console.log("resetVote event triggered");
        const session = sessions[sessionId];
        if (session) {
          session.estimates = [];
          io.to(sessionId).emit("resetVote");
        }
      });

      socket.on("disconnect", () => {
        console.log("A user disconnected");
        for (const sessionId in sessions) {
          const session = sessions[sessionId];
          session.users = session.users.filter((user) => user.id !== socket.id);
          if (session.users.length === 0) {
            delete sessions[sessionId];
          } else {
            io.to(sessionId).emit("updateUsers", session.users);
          }
        }
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler;

const sessions = {};

const generateSessionId = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let sessionId = "";
  for (let i = 0; i < 4; i++) {
    sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sessionId;
};
