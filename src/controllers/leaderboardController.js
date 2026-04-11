const LeaderboardEntry = require("../models/LeaderboardEntry");

async function getTopFluidityLeaderboard(_req, res) {
  try {
    const leaderboard = await LeaderboardEntry.find({})
      .sort({ highestFluidityScore: -1, sessionsCompleted: -1 })
      .limit(10)
      .lean();

    return res.json(
      leaderboard.map((entry) => ({
        userId: entry.userId,
        username: entry.username,
        displayName: entry.displayName,
        hydrationCredits: entry.hydrationCredits,
        highestFluidityScore: entry.highestFluidityScore,
        maxFluidity: entry.highestFluidityScore,
        latestExerciseType: entry.latestExerciseType,
        sessionsCompleted: entry.sessionsCompleted,
        totalKinks: entry.totalKinks
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getTopFluidityLeaderboard
};
