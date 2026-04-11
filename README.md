# 🏋️ FormFlow

> **Your camera is your personal trainer. Your friends keep you honest.**

FormFlow is a real-time exercise form analysis platform that watches you lift through your webcam, scores your movement quality rep by rep, and instantly broadcasts form failures to your workout group — so nobody cheats their way through a set alone.

Built in 48 hours at the **Code-A-Site Hackathon at Stony Brook University** by **Madhav Gupta, Sri Atragada, Tisha Mehta, and Siddhant Godha**.

---

## 🎯 The Problem

Bad form is the #1 cause of gym injuries — and most people have no idea their form is breaking down mid-set. Personal trainers are expensive. Gym mirrors lie. Friends don't want to be the one to say something.

FormFlow fixes this by turning your laptop camera into an always-on AI coaching assistant that catches form faults the moment they happen and calls you out in front of your whole friend group.

---

## ✨ Key Features

| Feature | What it does |
|---|---|
| 🤖 **Live Pose Tracking** | MediaPipe Pose runs frame-by-frame in the browser — no app install, no wearable |
| 📐 **Fluidity Scoring** | Every rep is scored 0–100 based on angular velocity smoothness via an exponential moving average |
| ⚠️ **Kink Detection** | Rule-based form fault detection for squats, deadlifts, bench press, and OHP (knee valgus, lumbar flexion, elbow flare, hip rise) |
| 🔁 **Rep Counter** | A phase state machine (`IDLE → DESCENDING → BOTTOM → ASCENDING → TOP`) counts reps automatically without any button presses |
| 💥 **Wipeout Alerts** | When bad form is detected, a `WIPEOUT_EVENT` fires over Socket.IO to every member of your workout group in real time |
| 🎬 **Session Replay** | Post-workout replay panel shows your fluidity curve and kink timeline so you can see exactly where the breakdown happened |
| 🏆 **Fluidity Leaderboard** | Top performers are ranked by their highest session fluidity scores across all workouts |
| 💧 **Hydration Credits** | Completing sessions earns hydration credits — a gamification hook that rewards consistency |
| 👥 **Friend Pools** | Group workout rooms (FriendPools) scope all real-time events and leaderboards to your crew |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React + Vite)                │
│                                                          │
│  Webcam → MediaPipe Pose → angleUtils → fluidityScorer  │
│                                    ↓                     │
│              kinkDetector ← phaseStateMachine            │
│                                    ↓                     │
│                          snapshotBuffer                  │
│                                    ↓                     │
│                          sessionManager ─────────────┐  │
└──────────────────────────────────────────────────────┼──┘
                                                        │ HTTP + Socket.IO
┌──────────────────────────────────────────────────────┼──┐
│                   Node.js / Express                   │  │
│                                                       ↓  │
│   REST API  ←──────────────────  Socket.IO server     │  │
│       ↓                                  ↓            │  │
│   MongoDB (Mongoose)          group:<groupId> rooms   │  │
│       ↓                                  ↑            │  │
│   Change Stream ────── WIPEOUT_EVENT ────┘            │  │
└──────────────────────────────────────────────────────────┘
```

### Backend — `src/`

The Node.js/Express backend handles persistence, scoring, and real-time fan-out.

- **`src/server.js`** — entrypoint; wires Express, Mongoose, Socket.IO, and the MongoDB change stream together
- **`src/models/User.js`** — athlete profile with hydration credits and session count
- **`src/models/Session.js`** — workout session with pose snapshots; auto-derives `averageFluidity`, `totalKinks`, and `maxFluidity` on save
- **`src/models/FriendPool.js`** — social group that scopes realtime rooms and leaderboard queries

### Frontend — `liquid-spine-ui/`

The React/Vite frontend is a three-tab Progressive Web App.

- **Home tab** — onboarding flow; select Beginner or Pro mode
- **Gym tab** (`GymTab.jsx`) — live camera feed, rep counter, fluidity gauge, wipeout overlay, and session replay chart
- **Social tab** (`SocialTab.jsx`) — fluidity leaderboard and friend group feed

### Pose Analysis Pipeline — `liquid-spine-ui/src/formflow/`

| Module | Responsibility |
|---|---|
| `poseEngine.js` | Loads MediaPipe Pose, opens the webcam, streams landmarks |
| `angleUtils.js` | Extracts `hipAngle`, `kneeAngle`, `lumbarFlexion` from landmarks |
| `fluidityScorer.js` | EMA-smoothed angular velocity → 0–100 fluidity score |
| `kinkDetector.js` | Heuristic thresholds per exercise type → named form fault flags |
| `phaseStateMachine.js` | Movement phase tracking → rep completion events |
| `snapshotBuffer.js` | Aggregates per-frame data into per-rep summaries |
| `sessionManager.js` | Coordinates the full session lifecycle with the backend |
| `socketClient.js` | Socket.IO client; joins group rooms and listens for wipeout events |

---

## 🍃 MongoDB at the Core

MongoDB is not just a storage layer in FormFlow — it is an active participant in the real-time workout experience.

### Document-Oriented Schema Design

Each workout entity maps naturally to a MongoDB document:

- **User** — athlete profile embedding hydration credits and a session counter directly on the document, making leaderboard-adjacent reads zero-join.
- **Session** — a rich document that stores the full `poseSnapshots` array (one entry per rep) alongside derived stats (`averageFluidity`, `totalKinks`, `maxFluidity`) that are **auto-computed via a Mongoose `pre('save')` hook** — so derived data is always consistent without any application-layer coordination.
- **FriendPool** — a lightweight group document that scopes every real-time query; membership is stored as an embedded array of user references, keeping group-room fan-out to a single document lookup.

### Change Streams powering real-time push

The most distinctive MongoDB integration is the **change stream** on the `sessions` collection:

```js
Session.watch().on('change', (change) => {
  // fires whenever a session document is inserted or updated
  if (kinks detected in change.fullDocument) {
    io.to(`group:${groupId}`).emit('WIPEOUT_EVENT', payload);
  }
});
```

This means the backend doesn't need polling or a separate message broker. MongoDB itself becomes the event source: the moment a session with form faults lands in the database — from *any* backend instance — the change stream triggers and Socket.IO broadcasts the `WIPEOUT_EVENT` to every member of that FriendPool in real time. This architecture would scale horizontally without any changes to the application code.

### Aggregation for leaderboard ranking

The top-fluidity leaderboard is served entirely by a **MongoDB aggregation pipeline**:

1. `$group` sessions by `userId`, capturing `$max` fluidity and `$sum` session count
2. `$sort` by `maxFluidity` descending
3. `$limit` to the top N entries
4. `$lookup` to join user display names in a single round-trip

No application-layer sorting or N+1 queries — the database does the heavy lifting.

---

## 📡 API Reference

### Health

```
GET /health
→ { ok: true }
```

### Sessions

```
POST /api/sessions
Body: { userId, groupId, exerciseType, poseSnapshots, sessionSummary }
→ { session, user }
```

Creates a session and increments the user's hydration credits and completed session count.
If the session summary contains kinks, emits `WIPEOUT_EVENT` to the group room immediately.

### Users

```
PATCH /api/users/:userId/hydration-credits
Body: { amount }
→ updated user document
```

### Leaderboard

```
GET /api/leaderboard/top-fluidity
→ [ { userId, username, maxFluidity, sessionCount }, ... ]
```

Aggregates sessions by user and ranks by highest recorded session fluidity.

---

## ⚡ Real-Time Events

FormFlow uses Socket.IO for group-scoped push events.

### Joining a group room

```js
socket.emit('join-group', { groupId: 'your-group-id' });
// Server joins socket to room: group:<groupId>
```

### WIPEOUT_EVENT

Fired when a session with detected kinks is saved, and again via MongoDB change stream if kinks appear in subsequent updates.

```js
socket.on('WIPEOUT_EVENT', (event) => {
  // event.sessionId    — which session broke down
  // event.totalKinks   — how many form faults were detected
  // event.maxFluidity  — best fluidity score in the session
  // event.kinkSnapshots — array of timestamped fault records
});
```

---

## 🧠 How the Scoring Works

### Fluidity Score (0–100)

Every video frame, we compute the angular velocity of the primary joints involved in the exercise. That velocity is smoothed with an **exponential moving average** (EMA) to suppress noise. The smoothed value is then inverted and normalized: slow, controlled movement scores near 100; abrupt or jerky movement drops the score.

> A perfect slow squat = ~95. A bounced-off-the-pins deadlift = ~30.

### Kink Detection

Each supported exercise has a set of biomechanical thresholds:

| Exercise | Detected Faults |
|---|---|
| Squat | `knee_valgus`, `lumbar_flex` |
| Deadlift | `lumbar_flex`, `hip_rise` |
| Bench Press | `elbow_flare` |
| Overhead Press | `elbow_flare`, `lumbar_flex` |

These are evaluated on every frame within an active rep. Any flagged fault is captured in the rep's snapshot and persisted to MongoDB.

### Rep Detection

The phase state machine transitions through five states — `IDLE`, `DESCENDING`, `BOTTOM`, `ASCENDING`, `TOP` — using joint-angle thresholds and a minimum rep duration guard. This approach is exercise-specific and filters out micro-movements that aren't real reps.

---

## 🚀 Local Setup

### Prerequisites

- Node.js 18+
- MongoDB (replica set required for change streams — see note below)
- A webcam

> **MongoDB change streams** require a replica set. For local development, start MongoDB with `--replSet rs0` or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier works).

### 1. Clone and configure

```bash
git clone https://github.com/FormFlow26/CodeASite26Project.git
cd CodeASite26Project
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/FormFlow?replicaSet=rs0
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Start the backend

```bash
npm install
npm run dev
```

The API server starts at `http://localhost:4000`.

### 3. Start the frontend

In a separate terminal:

```bash
cd liquid-spine-ui
npm install
npm run dev
```

The UI starts at `http://localhost:5173`.

### 4. (Optional) Seed demo data

```bash
npm run seed:demo
```

### Frontend environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Backend REST base URL |
| `VITE_SOCKET_URL` | `http://localhost:4000` | Socket.IO server URL |
| `VITE_USER_ID` | — | Load a specific user profile on startup |
| `VITE_GROUP_ID` | — | Join a specific group room on startup |

---

## ☁️ Deployment

### Backend → Render

Deploy `src/server.js` using the included [`render.yaml`](./render.yaml).

Required environment variables on Render:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/FormFlow
CLIENT_ORIGIN=https://your-vercel-site.vercel.app
PORT=4000
```

`CLIENT_ORIGIN` accepts a comma-separated list (e.g. to allow both local dev and production simultaneously).

Health check endpoint: `GET /health`

### Frontend → Vercel

Deploy the `liquid-spine-ui/` directory. Set these environment variables in Vercel:

```env
VITE_API_BASE_URL=https://formflow-api.onrender.com/api
VITE_SOCKET_URL=https://formflow-api.onrender.com
```

A template is provided at [`liquid-spine-ui/.env.example`](./liquid-spine-ui/.env.example).

---

## 📂 Project Structure

```
CodeASite26Project/
├── src/
│   ├── server.js              # Express + Socket.IO + MongoDB entrypoint
│   ├── index.js               # Browser-side FormFlow bootstrap
│   ├── models/
│   │   ├── User.js            # Athlete schema
│   │   ├── Session.js         # Workout session schema (auto-summarizes on save)
│   │   └── FriendPool.js      # Social group schema
│   ├── mediapipe/             # Pose analysis pipeline (browser)
│   └── socket/
│       └── socketClient.js    # Socket.IO client wrapper
├── liquid-spine-ui/           # React/Vite frontend
│   ├── src/
│   │   ├── App.jsx            # Root app shell with auth, nav, and realtime state
│   │   ├── components/
│   │   │   ├── GymTab.jsx     # Live camera, rep counter, fluidity HUD, replay
│   │   │   ├── SocialTab.jsx  # Leaderboard and friend feed
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginGate.jsx
│   │   │   ├── OnboardingModal.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   └── ReplayChart.jsx
│   │   ├── formflow/          # Pose engine and session logic
│   │   └── lib/
│   │       └── formflowApi.js # API + Socket.IO client layer
│   └── index.html
├── seed.js                    # Demo data seeder
├── render.yaml                # Render deployment config
├── vercel.json                # Vercel deployment config
└── .env.example               # Environment variable template
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Pose tracking | [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose) (browser, no install) |
| Frontend | React 19, Vite 8 |
| Backend | Node.js, Express 4 |
| Realtime | Socket.IO 4 |
| Database | MongoDB + Mongoose (change streams for push events) |
| Auth | Username/email + password (session stored in `localStorage`) |
| Backend hosting | Render |
| Frontend hosting | Vercel |

---

## 🔮 What's Next

FormFlow has a strong foundation. Here is where we take it after the hackathon:

1. **Full rep-streaming API** — add `PATCH /api/sessions/:id/rep` and `POST /api/sessions/:id/complete` so the client streams rep data incrementally rather than bulk-uploading at the end
2. **Richer session history** — store joint angles and form flags per rep, not just fluidity and kink boolean, to power a detailed post-workout breakdown
3. **ML classification** — replace hardcoded thresholds with a lightweight TFJS model trained on labeled lift footage
4. **Group challenges** — FriendPool weekly fluidity challenges with push notifications for when a friend beats your score
5. **Mobile PWA** — add a service worker and manifest so FormFlow installs natively on iOS/Android
6. **Audio coaching** — real-time text-to-speech cues ("brace your core", "slow the descent") triggered by kink detection

---

## 👥 Team

Built by **Team FormFlow** — **Madhav Gupta, Sri Atragada, Tisha Mehta, and Siddhant Godha** — at the Code-A-Site Hackathon at Stony Brook University.

---

## 📄 License

MIT
