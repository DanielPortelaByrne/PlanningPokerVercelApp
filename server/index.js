// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
// app.use(cors());

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });

const allowedOrigins = ["https://planning-poker-pointing.vercel.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Check if the origin is in the allowedOrigins array or if it's not set (for server-to-server requests)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

let sessions = {};

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
const generateSessionId = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let sessionId = "";
  for (let i = 0; i < 4; i++) {
    sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sessionId;
};

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

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
