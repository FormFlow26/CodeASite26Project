const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const mongoose = require("mongoose");

const User = require("./src/models/User");
const Session = require("./src/models/Session");
const FriendPool = require("./src/models/FriendPool");
const LeaderboardEntry = require("./src/models/LeaderboardEntry");
const { hashPassword } = require("./src/utils/passwords");
const { ensureLeaderboardEntryForUser, updateLeaderboardFromSession } = require("./src/services/leaderboardService");
const { awardSessionCompletionCredits } = require("./src/controllers/userController");

const DEMO_EMAILS = [
  "madhav.demo@formflow.app",
  "tisha.demo@formflow.app",
  "sri.demo@formflow.app",
  "judge.demo@formflow.app",
  "captain.demo@formflow.app",
];

const DEMO_PASSWORD = "formflow123";

function buildSnapshots(baseTime, fluidityScores, kinkIndexes = []) {
  return fluidityScores.map((score, index) => ({
    timestamp: new Date(baseTime.getTime() + index * 650),
    fluidityScore: score,
    kinkDetected: kinkIndexes.includes(index),
  }));
}

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in .env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
}

async function seedUsers() {
  const existingUsers = await User.find({ email: { $in: DEMO_EMAILS } }).lean();
  const existingByEmail = new Map(existingUsers.map((user) => [user.email, user]));

  const demoProfiles = [
    { email: DEMO_EMAILS[0], username: "madhav_demo", displayName: "Madhav Demo" },
    { email: DEMO_EMAILS[1], username: "tisha_demo", displayName: "Tisha Demo" },
    { email: DEMO_EMAILS[2], username: "sri_demo", displayName: "Sri Demo" },
    { email: DEMO_EMAILS[3], username: "judge_demo", displayName: "Judge Demo" },
    { email: DEMO_EMAILS[4], username: "captain_demo", displayName: "Captain Demo" },
  ];

  const users = [];

  for (const profile of demoProfiles) {
    if (existingByEmail.has(profile.email)) {
      users.push(await User.findById(existingByEmail.get(profile.email)._id));
      continue;
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const user = await User.create({
      ...profile,
      passwordHash,
    });
    users.push(user);
  }

  return users;
}

async function seedDemoData() {
  await connectToDatabase();

  const users = await seedUsers();
  const userIds = users.map((user) => user._id);

  let friendPool = await FriendPool.findOne({ name: "Hackathon Squad" });
  if (!friendPool) {
    friendPool = await FriendPool.create({
      name: "Hackathon Squad",
      ownerUserId: users[0]._id,
      memberUserIds: userIds,
    });
  } else {
    friendPool.memberUserIds = userIds;
    await friendPool.save();
  }

  await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { groupId: friendPool._id } }
  );

  await Session.deleteMany({ userId: { $in: userIds } });
  await LeaderboardEntry.deleteMany({ userId: { $in: userIds } });

  const sessionBlueprints = [
    { user: users[0], exerciseType: "Squat", scores: [84, 88, 91, 94], kinks: [] },
    { user: users[1], exerciseType: "Squat", scores: [67, 73, 76, 82], kinks: [2] },
    { user: users[2], exerciseType: "Deadlift", scores: [81, 86, 89, 92], kinks: [] },
    { user: users[3], exerciseType: "Lunge", scores: [58, 63, 70, 74, 79], kinks: [1, 3] },
    { user: users[4], exerciseType: "Pushup", scores: [72, 77, 83, 87], kinks: [] },
    { user: users[0], exerciseType: "Squat", scores: [60, 66, 71, 75, 80], kinks: [0, 2, 4] },
  ];

  const createdSessions = [];

  for (const [index, blueprint] of sessionBlueprints.entries()) {
    const session = await Session.create({
      userId: blueprint.user._id,
      groupId: friendPool._id,
      exerciseType: blueprint.exerciseType,
      poseSnapshots: buildSnapshots(new Date(Date.now() + index * 10000), blueprint.scores, blueprint.kinks),
    });

    const updatedUser = await awardSessionCompletionCredits(blueprint.user._id);
    await ensureLeaderboardEntryForUser(updatedUser);
    await updateLeaderboardFromSession(session, updatedUser);
    createdSessions.push(session);
  }

  console.log("Demo seed complete");
  console.log(JSON.stringify({
    demoLogin: {
      email: DEMO_EMAILS[0],
      password: DEMO_PASSWORD,
    },
    friendPoolId: String(friendPool._id),
    userIds: users.map((user) => ({ username: user.username, userId: String(user._id) })),
    sessions: createdSessions.map((session) => ({
      sessionId: String(session._id),
      userId: String(session.userId),
      exerciseType: session.exerciseType,
      maxFluidity: session.sessionSummary.maxFluidity,
      totalKinks: session.sessionSummary.totalKinks,
    })),
  }, null, 2));
}

seedDemoData()
  .catch((error) => {
    console.error("Demo seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
