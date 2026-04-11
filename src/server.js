const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const connectToDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const initializeSessionChangeStream = require("./services/changeStreamService");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const userRoutes = require("./routes/userRoutes");
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

const app = express();
const server = http.createServer(app);
const clientOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:5173"];

function isAllowedOrigin(requestOrigin) {
  if (!requestOrigin) {
    return true;
  }

  if (clientOrigins.includes(requestOrigin)) {
    return true;
  }

  try {
    const requestUrl = new URL(requestOrigin);

    return clientOrigins.some((allowedOrigin) => {
      const allowedUrl = new URL(allowedOrigin);
      const requestIsLoopback = LOOPBACK_HOSTS.has(requestUrl.hostname);
      const allowedIsLoopback = LOOPBACK_HOSTS.has(allowedUrl.hostname);

      return (
        requestUrl.protocol === allowedUrl.protocol &&
        requestUrl.port === allowedUrl.port &&
        requestIsLoopback &&
        allowedIsLoopback
      );
    });
  } catch {
    return false;
  }
}

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by Socket.io CORS"));
    },
    methods: ["GET", "POST", "PATCH"]
  }
});

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());
app.set("io", io);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "formflow-api",
    allowedOrigins: clientOrigins,
  });
});

app.use("/api/auth", authRoutes);
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
