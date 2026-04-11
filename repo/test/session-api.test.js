const test = require("node:test");
const assert = require("node:assert/strict");

const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const FriendPool = require("../src/models/FriendPool");
const Session = require("../src/models/Session");
const User = require("../src/models/User");
const { createServer } = require("../src/server");

let mongoServer;
let app;

test.before(async () => {
  process.env.ENABLE_SESSION_CHANGE_STREAM = "false";
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  ({ app } = createServer());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.beforeEach(async () => {
  await Promise.all([User.deleteMany({}), FriendPool.deleteMany({}), Session.deleteMany({})]);
});

test("session lifecycle endpoints persist incremental workout progress", async () => {
  const user = await User.create({ username: "review-athlete" });
  const group = await FriendPool.create({
    name: "review-group",
    ownerUserId: user._id,
    memberUserIds: [user._id]
  });

  const createResponse = await request(app).post("/api/sessions").send({
    userId: String(user._id),
    groupId: String(group._id),
    exerciseType: "squat",
    targetSets: 2,
    repsPerSet: 4
  });

  assert.equal(createResponse.status, 201);
  assert.ok(createResponse.body.sessionId);
  assert.equal(createResponse.body.progress.status, "active");

  const sessionId = createResponse.body.sessionId;
  const repResponse = await request(app)
    .patch(`/api/sessions/${sessionId}/rep`)
    .send({
      setNumber: 1,
      repNumber: 1,
      fluidityScore: 91.25,
      angles: {
        hipAngle: 102,
        kneeAngle: 95,
        lumbarFlexion: 21
      },
      flags: ["knee_valgus"],
      points: 86,
      durationMs: 1200,
      snapshots: [
        {
          timestamp: "2026-04-11T12:00:00.000Z",
          fluidityScore: 90,
          kinkDetected: false,
          angles: {
            hipAngle: 110,
            kneeAngle: 101,
            lumbarFlexion: 18
          },
          flags: []
        },
        {
          timestamp: "2026-04-11T12:00:00.300Z",
          fluidityScore: 80,
          kinkDetected: true,
          angles: {
            hipAngle: 97,
            kneeAngle: 92,
            lumbarFlexion: 42
          },
          flags: ["lumbar_flex"]
        }
      ]
    });

  assert.equal(repResponse.status, 200);
  assert.equal(repResponse.body.progress.totalScore, 86);
  assert.equal(repResponse.body.rep.flags[0], "knee_valgus");

  const flushResponse = await request(app).post(`/api/sessions/${sessionId}/flush-set`).send({
    setNumber: 1
  });

  assert.equal(flushResponse.status, 200);
  assert.equal(flushResponse.body.set.repsCompleted, 1);

  const completeResponse = await request(app).post(`/api/sessions/${sessionId}/complete`).send({
    totalScore: 86,
    sets: [{ setNumber: 1, repsCompleted: 1 }]
  });

  assert.equal(completeResponse.status, 200);
  assert.equal(completeResponse.body.progress.status, "completed");
  assert.equal(completeResponse.body.user.completedSessions, 1);

  const storedSession = await Session.findById(sessionId).lean();
  assert.equal(storedSession.reps.length, 1);
  assert.equal(storedSession.poseSnapshots.length, 2);
  assert.equal(storedSession.status, "completed");
  assert.equal(storedSession.totalScore, 86);

  const rejectedRepResponse = await request(app)
    .patch(`/api/sessions/${sessionId}/rep`)
    .send({
      setNumber: 2,
      repNumber: 1,
      fluidityScore: 75,
      flags: [],
      points: 75,
      snapshots: []
    });

  assert.equal(rejectedRepResponse.status, 409);
});

test("demo page and bootstrap route are available", async () => {
  const bootstrapResponse = await request(app).get("/api/demo/bootstrap");
  assert.equal(bootstrapResponse.status, 200);
  assert.ok(mongoose.isValidObjectId(bootstrapResponse.body.userId));
  assert.ok(mongoose.isValidObjectId(bootstrapResponse.body.groupId));

  const pageResponse = await request(app).get("/demo/");
  assert.equal(pageResponse.status, 200);
  assert.match(pageResponse.text, /FormFlow Demo/);
  assert.match(pageResponse.text, /\/demo\/app\.js/);
});
