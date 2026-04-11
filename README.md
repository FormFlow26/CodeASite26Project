# FormFlow CodeASite26Project

## What this project is

FormFlow is a social workout feedback platform built around one core idea:

- capture live exercise movement data from the user's camera
- score how smooth the movement is
- detect bad-form "kinks"
- persist workout sessions in MongoDB
- broadcast important events to a workout group in real time

The repository contains a fully runnable Node.js backend and a React/Vite frontend dashboard.

## Current architecture

There are two distinct parts in this codebase:

### 1. Express + MongoDB backend

Main entrypoint:

- `src/server.js`

Responsibilities:

- loads environment variables from `.env`
- connects to MongoDB through Mongoose
- starts an Express server
- mounts REST endpoints for auth, sessions, users, and leaderboard
- starts a MongoDB change stream on the `Session` collection
- creates a Socket.IO server for live group events

### 2. React/Vite frontend

Located in `liquid-spine-ui/`.

The frontend is a Vite + React application that provides:

- a live hydration leaderboard
- a user profile pane
- a post-workout session replay panel
- a camera-based gym view with realtime wipeout overlays
- Socket.IO integration for receiving `WIPEOUT_EVENT` alerts from the backend

The browser-side MediaPipe pose tracking pipeline lives in `src/mediapipe/` and `src/socket/`. Those modules are written as ES modules intended to run in the browser, not through the Node.js backend.

## Domain model

### User

Defined in `src/models/User.js`.

Represents an authenticated athlete in the system.

Fields:

- `email`
- `username`
- `displayName`
- `passwordHash` (excluded from API responses by default)
- `hydrationCredits`
- `completedSessions`
- `lastLoginAt`

This model is used for authentication, hydration rewards, and leaderboard enrichment.

### FriendPool

Defined in `src/models/FriendPool.js`.

Represents a social workout group.

Fields:

- `name`
- `ownerUserId`
- `memberUserIds`

This model backs the real-time "group room" behavior used by Socket.IO.

### Session

Defined in `src/models/Session.js`.

Represents one workout session for one user in one group.

Fields:

- `userId`
- `groupId`
- `exerciseType`
- `poseSnapshots`
- `totalScore`
- `completedAt`
- `sessionSummary`

`poseSnapshots` stores timestamped snapshots containing:

- `timestamp`
- `fluidityScore`
- `kinkDetected`
- `angles` (`hipAngle`, `kneeAngle`, `lumbarFlexion`)

Before saving, the model:

- filters snapshots to reduce density while preserving kink events (minimum 500 ms gap between non-kink snapshots)
- computes `averageFluidity`, `totalKinks`, and `maxFluidity`

The session summary is derived automatically from the raw snapshot list on every save.

### LeaderboardEntry

Defined in `src/models/LeaderboardEntry.js`.

A denormalized, per-user leaderboard document kept in sync with user and session data.

Fields:

- `userId`
- `username`
- `displayName`
- `hydrationCredits`
- `highestFluidityScore`
- `latestExerciseType`
- `sessionsCompleted`
- `totalKinks`

This document is created when a user registers, updated when hydration credits change, and updated again when a session is completed.

## API surface

### Health

- `GET /health`

Returns `{ ok: true, service: "formflow-api", allowedOrigins: [...] }`.

### Auth

- `POST /api/auth/register`

Registers a new user. Required body fields: `email`, `username`, `displayName`, `password` (minimum 8 characters). Returns the created user (without `passwordHash`) and automatically creates a leaderboard entry.

- `POST /api/auth/login`

Authenticates a user by `emailOrUsername` and `password`. Returns the user on success.

### Sessions

- `GET /api/sessions/:sessionId`

Returns a fully populated session document including user and group details, summary, and all pose snapshots.

- `POST /api/sessions`

Creates a new session document. Intended as the session start call; awards hydration credits and updates the leaderboard entry on creation.

- `PATCH /api/sessions/:sessionId/rep`

Appends a single rep snapshot to an existing session. Body fields: `fluidityScore` (required), `angles` (optional), `flags` (optional array of form flag strings). Returns the updated summary and the latest snapshot.

- `POST /api/sessions/:sessionId/flush-set`

Re-saves the session to trigger pre-save hooks that resample snapshots and recompute the summary. Called at set boundaries by the client.

- `POST /api/sessions/:sessionId/complete`

Marks a session as complete and optionally records a `totalScore`. Awards hydration credits and updates the leaderboard entry if the session had not been previously completed.

### Users

- `GET /api/users/:userId`

Returns the full user document for the given ID.

- `PATCH /api/users/:userId/hydration-credits`

Adds hydration credits to a user. Body field: `credits` (positive number, defaults to 1). Syncs the leaderboard entry after updating.

### Leaderboard

- `GET /api/leaderboard`
- `GET /api/leaderboard/top-fluidity`

Returns the top 10 users by highest fluidity score, then by sessions completed. Reads from the denormalized `LeaderboardEntry` collection.

## Realtime behavior

Socket.IO is initialized in `src/server.js`.

When a client connects, it can emit:

- `join-group`

The server then joins the socket to room:

- `group:<groupId>`

The main realtime event is:

- `WIPEOUT_EVENT`

This is emitted from a MongoDB change stream (`src/services/changeStreamService.js`) whenever an insert or update to the `Session` collection reveals snapshots with kinks. The event payload notifies the rest of the user's group that a bad-form event happened during a workout.

The React frontend connects to this event in `liquid-spine-ui/src/lib/formflowApi.js` and shows a wipeout overlay with an audio alert.

## Pose analysis pipeline

The movement-analysis logic lives in `src/mediapipe/` and is intended to run in the browser.

### `angleUtils.js`

Computes three normalized values from MediaPipe pose landmarks:

- `hipAngle`
- `kneeAngle`
- `lumbarFlexion`

For upper-body exercises (`bench`, `ohp`), the code reuses the same output shape even though the underlying joints differ. That keeps downstream scoring logic uniform.

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

Bridges the pose-analysis pipeline to the backend by:

- starting a session via `POST /api/sessions`
- appending rep snapshots via `PATCH /api/sessions/:sessionId/rep`
- flushing completed sets via `POST /api/sessions/:sessionId/flush-set`
- completing the session via `POST /api/sessions/:sessionId/complete`
- emitting client-side socket events

## What has been built

This repository is a prototype for a social workout feedback system with three layers:

1. **Movement intelligence** — The MediaPipe modules convert raw landmarks into interpretable exercise metrics.
2. **Session persistence** — The backend stores workout snapshots with angle detail and derives summary stats for scoring and history.
3. **Social feedback** — Socket rooms and `WIPEOUT_EVENT` make form mistakes visible to a group in real time.

The product idea is: "Track workout quality live, turn it into scores and warnings, and let friends react to each other's sessions."

## Known gaps and inconsistencies

### 1. Mixed module systems

- `src/server.js` and all backend files use CommonJS (`require`, `module.exports`)
- `src/index.js` and the MediaPipe files use ES module syntax (`import`, `export`)

`package.json` does not declare `"type": "module"` and there is no bundler for the backend. The backend runs correctly, but the browser-side MediaPipe pipeline is not packaged or served by this project. It is intended to be integrated into `liquid-spine-ui` or a separate bundled app.

### 2. No automated seed script

The database starts empty. Creating a user, a FriendPool, and at least one session is required before the leaderboard and profile pane in the UI have anything to render. See `docs/HOSTING.md` for a manual `mongosh` seed walkthrough.

### 3. No input validation for foreign keys

`POST /api/sessions` does not verify that `userId` or `groupId` reference existing documents before creating the session.

### 4. No automated test suite

There are no unit or integration tests in the repository.

## Run instructions

### Prerequisites

- Node.js
- MongoDB with replica set support (required for change streams)

Note: MongoDB change streams do not work on a plain standalone `mongod` instance. They require a replica set or a compatible deployment such as MongoDB Atlas.

### Backend setup

1. Copy `.env.example` to `.env`
2. Set `MONGODB_URI`
3. Run `npm install`
4. Run `npm run dev`

The server starts at `http://localhost:4000` by default.

### Frontend setup

In a separate terminal:

```bash
cd liquid-spine-ui
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` by default.

Frontend environment variables (all optional locally):

- `VITE_API_BASE_URL`: Backend API base URL. Defaults to `http://localhost:4000/api`.
- `VITE_SOCKET_URL`: Socket.IO server URL. Defaults to `http://localhost:4000`.
- `VITE_USER_ID`: Hex `_id` of the user whose profile loads on mount.
- `VITE_GROUP_ID`: Hex `_id` of the FriendPool whose realtime events the UI joins.

## Deployment

The repository is pre-configured for deployment to Render (backend) and Vercel (frontend) with MongoDB Atlas as the database.

- `render.yaml` — Render blueprint for the backend service
- `vercel.json` — Vercel build config pointing at `liquid-spine-ui/`
- `.env.example` — backend environment variable reference
- `liquid-spine-ui/.env.example` — frontend environment variable reference

See `docs/HOSTING.md` for the full step-by-step deployment walkthrough, including how to provision MongoDB Atlas, wire CORS, seed initial data, and verify end-to-end connectivity.

## Suggested next steps

1. Add foreign key existence validation to `POST /api/sessions`.
2. Wire the `liquid-spine-ui` camera view to `sessionManager.js` so the full pose-tracking loop runs in the browser and posts data to the backend.
3. Decide whether `src/index.js` and the MediaPipe modules should live inside `liquid-spine-ui` or remain as a separate browser bundle.
4. Add unit tests around session summary calculation and change stream event emission.
5. Add validation for `exerciseType` values against a known set of supported exercises.

## Short developer summary

FormFlow has a complete backend skeleton with auth, session lifecycle, leaderboard persistence, and realtime wipeout alerts — and a React frontend that consumes all of those APIs.

The strongest backend parts are:

- full session lifecycle (create → append reps → flush sets → complete)
- automatic session summary derivation from snapshots
- denormalized leaderboard kept in sync with users and sessions
- MongoDB change stream broadcasting group-level wipeout alerts

The strongest frontend parts are:

- leaderboard and profile views backed by live API calls
- Socket.IO integration for realtime wipeout overlays

What is still missing is the end-to-end connection between the browser camera, the MediaPipe pose pipeline, and the session API.
