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

## Deployment Setup

MongoDB Atlas is only the database. The Node/Express/Socket.io backend still needs its own public host.

### Backend deployment

The backend can be deployed to Render using [render.yaml](/Users/madhav/Downloads/CLASSES/hackathon/CodeASite26Project/render.yaml).

Backend environment variables:

```env
MONGODB_URI=your-atlas-uri
CLIENT_ORIGIN=https://your-vercel-site.vercel.app
PORT=4000
```

Notes:

- `CLIENT_ORIGIN` can be a comma-separated list if you want to allow local dev and Vercel at the same time.
- The health check endpoint is `GET /health`.

### Frontend deployment

The Vite frontend should be deployed from [liquid-spine-ui](/Users/madhav/Downloads/CLASSES/hackathon/CodeASite26Project/liquid-spine-ui) and configured with:

```env
VITE_API_BASE_URL=https://formflow-api.onrender.com/api
VITE_SOCKET_URL=https://formflow-api.onrender.com
```

An example file is included at [liquid-spine-ui/.env.example](/Users/madhav/Downloads/CLASSES/hackathon/CodeASite26Project/liquid-spine-ui/.env.example).

## Key Features

- Live hydration leaderboard backed by MongoDB.
- Realtime coaching alerts over Socket.io.
- Post-workout replay panel for flagged sessions.
- Camera-based frontend gym experience with session feedback.
# FormFlow CodeASite26Project

## What this project is

This repository is an early-stage FormFlow prototype centered on one idea:

- capture live exercise movement data
- score how smooth the movement is
- detect bad-form "kinks"
- persist workout sessions in MongoDB
- broadcast important events to a workout group in real time

In its current state, the repository is mostly a Node.js backend with a partially implemented browser-side pose tracking pipeline under `src/mediapipe/` and `src/socket/`.

## Current architecture

There are two distinct parts in this codebase:

### 1. Express + MongoDB backend

The backend is the only part that is directly runnable today.

Main entrypoint:

- `src/server.js`

Responsibilities:

- loads environment variables from `.env`
- connects to MongoDB through Mongoose
- starts an Express server
- mounts REST endpoints
- starts a MongoDB change stream on the `Session` collection
- creates a Socket.IO server for live group events

### 2. Browser-side exercise tracking modules

The browser-side logic is spread across:

- `src/index.js`
- `src/mediapipe/*`
- `src/socket/socketClient.js`

This code is written as ES modules and is intended to:

- open the user camera
- run MediaPipe Pose on each frame
- derive joint angles
- estimate movement fluidity
- detect form issues by exercise type
- detect completed reps using a phase state machine
- send rep and session updates to the backend

Important: this client path is not fully wired to the backend yet. See `Known gaps` below.

## Domain model

### User

Defined in `src/models/User.js`.

Represents an athlete in the system.

Fields:

- `username`
- `hydrationCredits`
- `completedSessions`

This model is used for hydration rewards and leaderboard enrichment.

### FriendPool

Defined in `src/models/FriendPool.js`.

Represents a social workout group.

Fields:

- `name`
- `ownerUserId`
- `memberUserIds`

This model appears intended to back the real-time "group room" behavior used by Socket.IO.

### Session

Defined in `src/models/Session.js`.

Represents one workout session for one user in one group.

Fields:

- `userId`
- `groupId`
- `exerciseType`
- `poseSnapshots`
- `sessionSummary`

`poseSnapshots` stores timestamped snapshots containing:

- `timestamp`
- `fluidityScore`
- `kinkDetected`

Before saving, the model:

- filters snapshots to reduce density while preserving kink events
- computes `averageFluidity`, `totalKinks`, and `maxFluidity`

That means the session summary is derived automatically from the raw snapshot list.

## API surface that currently exists

### Health

- `GET /health`

Returns a simple `{ ok: true }`.

### Sessions

- `POST /api/sessions`

Creates a session document from the request body. After creation, it also increments the associated user's:

- `hydrationCredits`
- `completedSessions`

If the stored session summary includes kinks, the backend emits a `WIPEOUT_EVENT` to the session's group room.

### Users

- `PATCH /api/users/:userId/hydration-credits`

Adds hydration credits to a user.

### Leaderboard

- `GET /api/leaderboard/top-fluidity`

Aggregates sessions by user and returns the top performers by highest recorded session fluidity.

## Realtime behavior

Socket.IO is initialized in `src/server.js`.

When a client connects, it can emit:

- `join-group`

The server then joins the socket to room:

- `group:<groupId>`

The main realtime event in the current codebase is:

- `WIPEOUT_EVENT`

This is emitted in two places:

- immediately after session creation if the session summary already contains kinks
- from a MongoDB change stream if updates or inserts reveal kinked snapshots

The event payload is meant to notify the rest of a user's group that a bad-form event happened during a workout.

## Pose analysis pipeline

The movement-analysis logic is conceptually the most interesting part of the repo.

### `angleUtils.js`

Computes three normalized values from pose landmarks:

- `hipAngle`
- `kneeAngle`
- `lumbarFlexion`

For upper-body exercises (`bench`, `ohp`), the code reuses the same output shape even though the underlying joints differ. That keeps downstream scoring logic simple.

### `fluidityScorer.js`

Tracks smoothed angular velocity across frames using an EMA and turns that into a `0-100` fluidity score.

Interpretation:

- slower, more stable movement trends toward a higher score
- abrupt joint velocity reduces the score

### `kinkDetector.js`

Contains hardcoded heuristic thresholds for:

- `squat`
- `deadlift`
- `bench`
- `ohp`

Examples of detected flags:

- `knee_valgus`
- `lumbar_flex`
- `elbow_flare`
- `hip_rise`

This is rule-based form analysis, not ML classification.

### `phaseStateMachine.js`

Implements rep detection using a simple movement state machine:

- `IDLE`
- `DESCENDING`
- `BOTTOM`
- `ASCENDING`
- `TOP`

Each exercise has its own angle thresholds and minimum rep duration. When a full movement cycle completes, the code calls `onRepComplete(...)`.

### `snapshotBuffer.js`

Buffers per-frame snapshots during a rep and computes:

- average fluidity
- peak observed angles
- union of form flags
- whether any kink happened during the rep

### `poseEngine.js`

Loads MediaPipe Pose from a CDN, opens the webcam, and continuously sends video frames through the pose model. If pose tracking is lost for 3 seconds, it emits a warning.

### `sessionManager.js`

Intended to bridge the pose-analysis pipeline to the backend by:

- starting a session
- sending rep updates
- flushing completed sets
- completing the session
- emitting client-side socket events

This file shows the intended app flow very clearly, but it does not currently match the backend implementation.

## What you have built conceptually

As the developer, the thing you have created is not just "a server". It is a prototype for a social workout feedback system with three layers:

1. Movement intelligence
The MediaPipe modules convert raw landmarks into interpretable exercise metrics.

2. Session persistence
The backend stores workout snapshots and derives summary stats for scoring and history.

3. Social feedback
Socket rooms and `WIPEOUT_EVENT` make form mistakes visible to a group in real time.

The product idea is basically:

"Track workout quality live, turn it into scores and warnings, and let friends react to each other's sessions."

## Known gaps and inconsistencies

These are the most important implementation gaps in the current repo.

### 1. Mixed module systems

- `src/server.js` and backend files use CommonJS (`require`, `module.exports`)
- `src/index.js` and MediaPipe files use ES module syntax (`import`, `export`)

But `package.json` does not declare `"type": "module"` and there is no bundler configuration. That means the backend runs, but the browser-side code is not currently packaged or served as part of this project.

### 2. Client and server ports do not agree

- backend defaults to `PORT=4000`
- browser `sessionManager` defaults to `http://localhost:3001`
- browser `src/index.js` defaults to `http://localhost:3001`
- `.env.example` says `CLIENT_ORIGIN=http://localhost:3000`

So the repo implies a frontend on port `3000`, a backend on `4000`, and the client integration code pointing at `3001`.

### 3. Session API contract mismatch

The backend exposes only:

- `POST /api/sessions`

But `sessionManager.js` expects these additional endpoints:

- `PATCH /api/sessions/:sessionId/rep`
- `POST /api/sessions/:sessionId/flush-set`
- `POST /api/sessions/:sessionId/complete`

Those routes/controllers do not exist yet.

### 4. Session creation response mismatch

`sessionManager.startSession()` expects the POST response body itself to contain `_id`.

But `createSession()` currently returns:

- `{ session, user }`

So the current browser code would fail session initialization even if everything else were wired up.

### 5. Persisted snapshots are thinner than in-memory snapshots

The rep pipeline produces snapshots with:

- angles
- flags
- fluidity
- kink state

But the Mongoose `poseSnapshotSchema` only stores:

- timestamp
- fluidityScore
- kinkDetected

So angle and flag detail is currently lost when a session is persisted.

### 6. No frontend host app in this repo

There is browser logic, but no HTML app, React app, Vite config, or static serving setup that actually runs `startFormFlow()` in a browser.

## Run instructions

### Prerequisites

- Node.js
- MongoDB replica set support if you want change streams to work reliably

Note: MongoDB change streams do not work on a plain standalone MongoDB instance. They require a replica set or compatible deployment.

### Setup

1. Copy `.env.example` to `.env`
2. Set `MONGODB_URI`
3. Run `npm install`
4. Run `npm run dev`

### Server entrypoint

The server starts from:

- `src/server.js`

Default URL:

- `http://localhost:4000`

## Suggested next steps

If your goal is to make this into a working product slice, the next steps are:

1. Pick one runtime architecture:
   either keep this repo backend-only, or add a real frontend app and bundler.
2. Reconcile the session API contract between `sessionManager.js` and `sessionController.js`.
3. Decide whether reps are stored incrementally or only as a final session upload.
4. Expand the `Session` schema if you want to retain angles, flags, rep/set metadata, or scores.
5. Add validation for `exerciseType`, foreign key existence, and malformed session payloads.
6. Add tests around session summary calculation and change stream event emission.

## Short developer summary

You have built the backend skeleton of a workout-form intelligence platform.

The strongest part is the conceptual motion-analysis pipeline:

- angle extraction
- fluidity scoring
- rule-based form fault detection
- rep phase tracking

The strongest part of the backend is:

- storing sessions
- deriving session summaries
- exposing a leaderboard
- broadcasting group-level wipeout alerts

What is still missing is the glue that turns those pieces into one end-to-end runnable product.
