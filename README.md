# FormFlow

FormFlow is a realtime training demo with a Node.js backend, MongoDB persistence, Socket.io alerts, and a React/Vite frontend dashboard.

## Project Structure

- `src/`: Express server, Socket.io events, MongoDB models, and session logic.
- `liquid-spine-ui/`: React frontend for the training dashboard, gym view, and social leaderboard.

## Local Setup

### 1. Backend

Create a root `.env` file with:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/FormFlow
CLIENT_ORIGIN=http://localhost:5173
```

Install and start the backend:

```bash
npm install
npm run dev
```

### 2. Frontend

In a separate terminal:

```bash
cd liquid-spine-ui
npm install
npm run dev
```

Optional frontend environment variables:

- `VITE_API_BASE_URL`: API base URL for the backend. Defaults to `http://localhost:4000/api`.
- `VITE_SOCKET_URL`: Socket.io server URL. Defaults to `http://localhost:4000`.
- `VITE_USER_ID`: Optional user ID to load a specific profile in the UI.
- `VITE_GROUP_ID`: Optional realtime group ID for scoped socket events.

## Key Features

- Live hydration leaderboard backed by MongoDB.
- Realtime coaching alerts over Socket.io.
- Post-workout replay panel for flagged sessions.
- Camera-based frontend gym experience with session feedback.
