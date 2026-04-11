let socketIoLoader = null;
let socketIoScriptUrl = "";

function normalizeBaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function loadSocketIoClient(serverUrl) {
  if (window.io) {
    return Promise.resolve(window.io);
  }

  const scriptUrl = `${normalizeBaseUrl(serverUrl)}/socket.io/socket.io.js`;

  if (socketIoLoader && socketIoScriptUrl === scriptUrl) {
    return socketIoLoader;
  }

  socketIoScriptUrl = scriptUrl;
  socketIoLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

    if (existingScript) {
      if (window.io) {
        resolve(window.io);
        return;
      }

      existingScript.addEventListener("load", () => resolve(window.io), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error(`Failed to load Socket.io client from ${scriptUrl}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      if (window.io) {
        resolve(window.io);
        return;
      }

      reject(new Error("Socket.io client did not initialize"));
    };
    script.onerror = () => reject(new Error(`Failed to load Socket.io client from ${scriptUrl}`));
    document.head.appendChild(script);
  });

  return socketIoLoader;
}

export async function createSocketClient({ serverUrl, groupId, userId }) {
  const io = await loadSocketIoClient(serverUrl);
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
