const Session = require("../models/Session");

async function getTopFluidityLeaderboard(_req, res) {
  try {
    const leaderboard = await Session.aggregate([
      {
        $group: {
          _id: "$userId",
          highestFluidityScore: { $max: "$sessionSummary.maxFluidity" },
          latestExerciseType: { $last: "$exerciseType" },
          sessionsCompleted: { $sum: 1 }
        }
      },
      {
        $sort: {
          highestFluidityScore: -1,
          sessionsCompleted: -1
        }
      },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          username: "$user.username",
          hydrationCredits: "$user.hydrationCredits",
          highestFluidityScore: 1,
          maxFluidity: "$highestFluidityScore",
          latestExerciseType: 1,
          sessionsCompleted: 1
        }
      }
    ]);

    return res.json(leaderboard);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getTopFluidityLeaderboard
};
