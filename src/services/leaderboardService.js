const LeaderboardEntry = require("../models/LeaderboardEntry");
const User = require("../models/User");

async function updateLeaderboardFromSession(session, user) {
  const profile = user || (await User.findById(session.userId).lean());
  if (!profile) {
    return null;
  }

  const displayName = profile.displayName || profile.username;
  const existingEntry = await LeaderboardEntry.findOne({ userId: session.userId }).lean();
  const highestFluidityScore = Math.max(
    existingEntry?.highestFluidityScore || 0,
    session.sessionSummary?.maxFluidity || 0
  );

  return LeaderboardEntry.findOneAndUpdate(
    { userId: session.userId },
    {
      $set: {
        username: profile.username,
        displayName,
        hydrationCredits: profile.hydrationCredits || 0,
        highestFluidityScore,
        latestExerciseType: session.exerciseType,
        sessionsCompleted: profile.completedSessions || 0,
        totalKinks: (existingEntry?.totalKinks || 0) + (session.sessionSummary?.totalKinks || 0),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

module.exports = {
  updateLeaderboardFromSession,
};
