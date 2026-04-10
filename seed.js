require("dotenv").config();

const mongoose = require("mongoose");

const User = require("./src/models/User");
const Session = require("./src/models/Session");
const FriendPool = require("./src/models/FriendPool");

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI in .env");
  }

  await mongoose.connect(uri);
}

function buildSnapshots(baseTime, fluidityScores, kinkIndexes = []) {
  return fluidityScores.map((score, index) => ({
    timestamp: new Date(baseTime.getTime() + index * 600),
    fluidityScore: score,
    kinkDetected: kinkIndexes.includes(index)
  }));
}

async function seed() {
  await connectToDatabase();

  const usernames = ["madhav_seed", "tisha_seed", "sri_seed"];

  await User.deleteMany({ username: { $in: usernames } });

  const users = await User.create([
    { username: "madhav_seed", hydrationCredits: 5, completedSessions: 1 },
    { username: "tisha_seed", hydrationCredits: 2, completedSessions: 0 },
    { username: "sri_seed", hydrationCredits: 7, completedSessions: 2 }
  ]);

  await FriendPool.deleteMany({ name: "Seed FriendPool" });

  const friendPool = await FriendPool.create({
    name: "Seed FriendPool",
    ownerUserId: users[0]._id,
    memberUserIds: users.map((user) => user._id)
  });

  await Session.deleteMany({
    userId: { $in: users.map((user) => user._id) },
    groupId: friendPool._id
  });

  const baseTime = new Date();

  const sessionPayloads = [
    {
      userId: users[0]._id,
      groupId: friendPool._id,
      exerciseType: "Squat",
      poseSnapshots: buildSnapshots(baseTime, [72, 81, 88, 91], [])
    },
    {
      userId: users[1]._id,
      groupId: friendPool._id,
      exerciseType: "Squat",
      poseSnapshots: buildSnapshots(baseTime, [60, 66, 74, 79], [2])
    },
    {
      userId: users[2]._id,
      groupId: friendPool._id,
      exerciseType: "Deadlift",
      poseSnapshots: buildSnapshots(baseTime, [78, 83, 86, 93], [])
    },
    {
      userId: users[0]._id,
      groupId: friendPool._id,
      exerciseType: "Lunge",
      poseSnapshots: buildSnapshots(baseTime, [55, 68, 71, 77, 84], [1, 2, 4])
    },
    {
      userId: users[1]._id,
      groupId: friendPool._id,
      exerciseType: "Pushup",
      poseSnapshots: buildSnapshots(baseTime, [64, 70, 76, 82, 89], [])
    }
  ];

  const sessions = [];
  for (const payload of sessionPayloads) {
    const session = await Session.create(payload);
    sessions.push(session);
  }

  console.log("Seed complete");
  console.log(
    JSON.stringify(
      {
        users: users.map((user) => ({
          id: user._id,
          username: user.username
        })),
        friendPoolId: friendPool._id,
        sessions: sessions.map((session) => ({
          id: session._id,
          userId: session.userId,
          exerciseType: session.exerciseType,
          maxFluidity: session.sessionSummary.maxFluidity,
          totalKinks: session.sessionSummary.totalKinks
        }))
      },
      null,
      2
    )
  );
}

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
