const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const connectToDatabase = require("./config/db");
const initializeSessionChangeStream = require("./services/changeStreamService");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "*",
    methods: ["GET", "POST", "PATCH"]
  }
});

app.use(express.json());
app.set("io", io);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/users", userRoutes);

io.on("connection", (socket) => {
  socket.on("join-group", (groupId) => {
    if (groupId) {
      socket.join(`group:${groupId}`);
    }
  });
});

async function startServer() {
  await connectToDatabase();
  initializeSessionChangeStream(io);

  const port = Number(process.env.PORT || 4000);
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
