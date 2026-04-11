const SOCKET_IO_CDN_URL = "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";

let socketIoLoader = null;

async function loadSocketIoClient() {
  if (window.io) {
    return { io: window.io };
  }

  if (!socketIoLoader) {
    socketIoLoader = import(SOCKET_IO_CDN_URL);
  }

  return socketIoLoader;
}

export async function createSocketClient({ serverUrl, groupId, userId }) {
  const socketModule = await loadSocketIoClient();
  const io = socketModule.io || window.io;
  if (!io) {
    throw new Error("socket.io-client could not be loaded");
  }

  const socket = io(serverUrl, {
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    // The current backend expects a raw groupId string rather than an object payload.
    socket.emit("join-group", groupId);
  });

  socket.on("WIPEOUT_EVENT", (data) => {
    if (typeof window.onWipeoutEvent === "function") {
      window.onWipeoutEvent(data);
    }
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error", error);
  });

  return {
    socket,
    userId,
    groupId,
    emit(event, data) {
      socket.emit(event, data);
    },
    on(event, handler) {
      socket.on(event, handler);
    },
    disconnect() {
      socket.disconnect();
    }
  };
}
