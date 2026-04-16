const DEFAULT_API_BASE_URL = 'https://formflow-api.onrender.com/api';
const DEFAULT_SOCKET_URL = 'https://formflow-api.onrender.com';

let socketScriptPromise = null;
let audioContext = null;

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function getErrorMessage(response, body) {
  if (body?.error) return body.error;
  if (body?.message) return body.message;
  return `Request failed (${response.status})`;
}

async function requestJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);

    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { /* non-JSON response */ }

    if (!response.ok) {
      throw new Error(getErrorMessage(response, body));
    }

    return body;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError') || err.message.includes('fetch')) {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw err;
  }
}

export function getRuntimeConfig() {
  const apiBaseUrl = normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  );
  const socketUrl = normalizeBaseUrl(
    import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL,
  );

  return {
    apiBaseUrl,
    socketUrl,
    userId: import.meta.env.VITE_USER_ID || '',
    groupId: import.meta.env.VITE_GROUP_ID || '',
  };
}

export async function getLeaderboard() {
  const { apiBaseUrl } = getRuntimeConfig();
  return requestJson(`${apiBaseUrl}/leaderboard/top-fluidity`);
}

export async function registerUser(payload) {
  const { apiBaseUrl } = getRuntimeConfig();
  return requestJson(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  const { apiBaseUrl } = getRuntimeConfig();
  return requestJson(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function getUserProfile(userId) {
  const { apiBaseUrl } = getRuntimeConfig();
  return requestJson(`${apiBaseUrl}/users/${userId}`);
}

export async function addHydrationCredits(userId, credits) {
  const { apiBaseUrl } = getRuntimeConfig();
  return requestJson(`${apiBaseUrl}/users/${userId}/hydration-credits`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credits }),
  });
}

export async function getSessionReplay(sessionId) {
  const { apiBaseUrl } = getRuntimeConfig();
  return requestJson(`${apiBaseUrl}/sessions/${sessionId}`);
}

async function loadSocketClient(socketUrl) {
  if (window.io) {
    return window.io;
  }

  if (!socketScriptPromise) {
    socketScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${socketUrl}/socket.io/socket.io.js`;
      script.async = true;
      script.onload = () => {
        if (window.io) {
          resolve(window.io);
          return;
        }

        reject(new Error('socket.io client did not initialize'));
      };
      script.onerror = () => reject(new Error('Failed to load socket.io client'));
      document.head.appendChild(script);
    });
  }

  return socketScriptPromise;
}

export async function connectToRealtimeFeed({
  socketUrl,
  groupId,
  onStatusChange,
  onWipeout,
}) {
  onStatusChange?.('connecting');

  const io = await loadSocketClient(socketUrl);
  const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    onStatusChange?.('connected');

    if (groupId) {
      socket.emit('join-group', groupId);
    }
  });

  socket.on('disconnect', () => {
    onStatusChange?.('disconnected');
  });

  socket.on('connect_error', () => {
    onStatusChange?.('error');
  });

  socket.on('WIPEOUT_EVENT', (payload) => {
    onWipeout?.(payload);
  });

  return {
    disconnect() {
      socket.disconnect();
    },
  };
}

export function playWipeoutAlertTone() {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(320, now);
  oscillator.frequency.linearRampToValueAtTime(220, now + 0.18);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.24);
}
