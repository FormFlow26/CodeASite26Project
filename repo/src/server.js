const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const connectToDatabase = require("./config/db");
const initializeSessionChangeStream = require("./services/changeStreamService");
const demoRoutes = require("./routes/demoRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const userRoutes = require("./routes/userRoutes");

function createApp(io) {
  const app = express();

  app.use(express.json());
  app.set("io", io);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/demo", demoRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/sessions", sessionRoutes);
  app.use("/api/users", userRoutes);

  app.use("/src", express.static(path.resolve(__dirname)));
  app.use("/demo", express.static(path.resolve(__dirname, "../public/demo")));
  app.get("/", (_req, res) => {
    res.redirect("/demo/");
  });

  return app;
}

function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST", "PATCH"]
    }
  });
  const configuredApp = createApp(io);

  app.use(configuredApp);

  io.on("connection", (socket) => {
    socket.on("join-group", (groupId) => {
      if (groupId) {
        socket.join(`group:${groupId}`);
      }
    });
  });

  return { app, io, server };
}

async function startServer() {
  await connectToDatabase();

  const { server, io } = createServer();
  initializeSessionChangeStream(io);

  const port = Number(process.env.PORT || 4000);
  await new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      resolve();
    });
  });

  return { server, io };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  createServer,
  startServer
};
