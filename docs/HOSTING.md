# Hosting FormFlow on Render + Vercel + MongoDB Atlas

This walkthrough deploys the backend (Node/Express + Socket.IO) to **Render**,
the frontend (Vite/React) to **Vercel**, and the database to **MongoDB Atlas**.
All three have free tiers and no credit card is required.

The repo is already pre-configured:

- `render.yaml` — Render blueprint for the backend
- `vercel.json` — Vercel build config for `liquid-spine-ui/`
- `.env.example` — backend env vars
- `liquid-spine-ui/.env.example` — frontend env vars

The order matters: **Atlas → Render → Vercel**, because Render needs the
Atlas connection string and Vercel needs the Render URL.

---

## 1. MongoDB Atlas (database)

FormFlow uses MongoDB Change Streams (`src/services/changeStreamService.js`),
which **require a replica set**. Any Atlas cluster qualifies — even the free
M0 shared tier — because Atlas provisions every cluster as a 3-node replica
set automatically.

1. Sign up at <https://cloud.mongodb.com> (no card needed).
2. Create a free **M0 cluster**. Pick the region closest to your Render
   region (e.g. AWS / `us-east-1` if you'll deploy Render in Oregon).
3. **Database Access** → *Add New Database User*. Use a strong password.
   Save it; you'll paste it into the connection string.
4. **Network Access** → *Add IP Address* → **Allow Access from Anywhere**
   (`0.0.0.0/0`). This is required because Render's egress IPs aren't
   stable on the free plan.
5. **Database** → *Connect* → *Drivers* → copy the SRV connection string.
   It looks like:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Append a database name before the query string so all collections live
   in one place:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/formflow?retryWrites=true&w=majority
   ```

   Save this — it becomes `MONGODB_URI` on Render.

> **Sanity check (optional, local):** with `MONGODB_URI` exported in your
> shell, run `npm install && npm start` from the repo root. You should see
> `Connected to MongoDB` and `Server listening on port 4000`. Then
> `curl http://localhost:4000/health` returns `{"ok":true,...}`. Stop with
> `Ctrl-C`.

---

## 2. Render (backend)

1. Sign up at <https://render.com> with your GitHub account so Render can
   read this repository.
2. **New** → *Blueprint* → select the FormFlow repo. Render auto-detects
   `render.yaml` and proposes a service named `formflow-api`.
3. Before clicking *Apply*, expand the *Environment Variables* section.
   `render.yaml` declares two `sync: false` vars that you must fill in:
   - `MONGODB_URI` → the Atlas SRV string from §1.
   - `CLIENT_ORIGIN` → leave blank for now; you'll come back after Vercel.
4. Click *Apply*. Render builds (`npm install`) and starts (`npm start`).
   The first build on the free plan takes ~3 minutes.
5. Once status is **Live**, copy the assigned URL — e.g.
   `https://formflow-api.onrender.com`. Save it for Vercel.
6. Verify health: open `https://formflow-api.onrender.com/health` in a
   browser. You should see JSON with `"ok": true` and the current
   `allowedOrigins` (will be the localhost default until you set
   `CLIENT_ORIGIN`).

> **Cold starts:** Render's free web service spins down after 15 minutes of
> idle traffic and takes ~30 seconds to wake up. Expect the first request
> after a long pause to feel slow.

---

## 3. Vercel (frontend)

1. Sign up at <https://vercel.com> with the same GitHub account.
2. **Add New** → *Project* → import the FormFlow repo. Vercel reads
   `vercel.json` and infers Vite. Do **not** override the build settings —
   the install/build commands are intentionally `cd liquid-spine-ui && ...`
   so the monorepo layout works.
3. Before clicking *Deploy*, open *Environment Variables* and add:

   | Name | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | `https://formflow-api.onrender.com/api` |
   | `VITE_SOCKET_URL`   | `https://formflow-api.onrender.com` |
   | `VITE_USER_ID`      | *(leave blank for now — fill in once you create a user; see §5)* |
   | `VITE_GROUP_ID`     | *(leave blank for now — fill in once you create a FriendPool; see §5)* |

   Set them for the **Production** environment (and Preview if you want).
4. Click *Deploy*. After ~30 seconds you'll get a URL like
   `https://formflow-xxxx.vercel.app`. Save it for the next step.

---

## 4. Wire CORS back to the backend

The Render backend won't accept browser requests from Vercel until you tell
it the new origin.

1. Render dashboard → `formflow-api` → *Environment*.
2. Set `CLIENT_ORIGIN` to your Vercel URL, e.g.
   `https://formflow-xxxx.vercel.app`. If you also want preview deploys to
   work, add them comma-separated:
   `https://formflow-xxxx.vercel.app,https://formflow-git-main-you.vercel.app`
3. Save → Render restarts the service automatically.
4. Re-check `https://formflow-api.onrender.com/health` and confirm
   `allowedOrigins` reflects the new value.

---

## 5. Create the minimum data the UI expects

Without any documents in the database the UI loads but has nothing to
render. There is no automated seed script (intentional). You can create
the bare minimum from your laptop with three `curl` calls. You'll need
the Atlas connection string from §1 and `mongosh` (or any Mongo client).

The model files live at `src/models/User.js`, `src/models/FriendPool.js`,
and `src/models/Session.js` if you want to see the full schemas.

```sh
mongosh "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/formflow"
```

```js
// inside mongosh
use formflow

// 1. one user
const userResult = db.users.insertOne({
  username: "demo",
  hydrationCredits: 0,
  completedSessions: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const userId = userResult.insertedId;

// 2. one friend pool owned by that user
const poolResult = db.friendpools.insertOne({
  name: "Demo Pool",
  ownerUserId: userId,
  memberUserIds: [userId],
  createdAt: new Date(),
  updatedAt: new Date(),
});
const groupId = poolResult.insertedId;

// 3. one finished session so the leaderboard isn't empty
db.sessions.insertOne({
  userId: userId,
  groupId: groupId,
  exerciseType: "squat",
  poseSnapshots: [
    { timestamp: new Date(), fluidityScore: 82, kinkDetected: false },
    { timestamp: new Date(), fluidityScore: 91, kinkDetected: false },
  ],
  totalScore: 180,
  sessionSummary: { averageFluidity: 86.5, totalKinks: 0, maxFluidity: 91 },
  createdAt: new Date(),
  updatedAt: new Date(),
});

// print the IDs you need for Vercel env vars
print("VITE_USER_ID =", userId.toString());
print("VITE_GROUP_ID =", groupId.toString());
```

Copy the printed IDs back into Vercel → *Environment Variables* and
trigger a redeploy (Vercel → *Deployments* → ⋯ → *Redeploy*).

---

## 6. Verify end-to-end

1. Open the Vercel URL in a browser.
2. The leaderboard tab should show the seeded user with a max fluidity
   of 91. The profile header should show `demo` with 0 hydration credits.
3. Open DevTools → *Network* → confirm requests go to
   `https://formflow-api.onrender.com/api/...` and return 200.
4. DevTools → *Network* → *WS* — the `socket.io` websocket should be in
   the `101 Switching Protocols` state.

### Triggering a live `WIPEOUT_EVENT`

The simplest way to confirm realtime is wired up:

```sh
SESSION_ID=...                           # _id from the seeded session
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"fluidityScore": 30, "flags": ["lumbar-flexion-too-high"]}' \
  https://formflow-api.onrender.com/api/sessions/$SESSION_ID/rep
```

The change-stream service in `src/services/changeStreamService.js`
detects the new kink snapshot, broadcasts `WIPEOUT_EVENT` over Socket.IO,
and the React UI shows the wipeout overlay + plays the alert tone
(`liquid-spine-ui/src/lib/formflowApi.js:88`).

---

## Required environment variables (reference)

### Backend (Render → `formflow-api`)

| Name | Required | Notes |
| --- | --- | --- |
| `PORT` | yes | `render.yaml` sets to `4000` |
| `MONGODB_URI` | yes | Atlas SRV string with database name |
| `CLIENT_ORIGIN` | yes | Comma-separated allowed origins |

### Frontend (Vercel)

| Name | Required | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | `https://<render-url>/api` |
| `VITE_SOCKET_URL` | yes | `https://<render-url>` |
| `VITE_USER_ID` | optional | Hex `_id` of the user whose profile loads on mount |
| `VITE_GROUP_ID` | optional | Hex `_id` of the FriendPool whose realtime events you join |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Backend logs `MongoServerError: $changeStream stage is only supported on replica sets` | You pointed `MONGODB_URI` at a non-replica-set Mongo (e.g. local `mongod`) | Use Atlas, or run local Mongo with `--replSet rs0` and initiate the set |
| Frontend network tab shows CORS errors | `CLIENT_ORIGIN` doesn't match the actual Vercel URL | Update `CLIENT_ORIGIN` on Render and wait for the auto-restart |
| Leaderboard renders but is empty | No sessions exist yet | Run the §5 mongosh seed |
| Profile pane never loads | `VITE_USER_ID` is unset or doesn't match a user `_id` | Set `VITE_USER_ID` in Vercel and redeploy |
| `WIPEOUT_EVENT` never fires after `/rep` curl | `groupId` mismatch — the UI joined a different room | Make sure the seeded session's `groupId` equals `VITE_GROUP_ID` |
