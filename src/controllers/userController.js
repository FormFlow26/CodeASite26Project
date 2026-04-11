const User = require("../models/User");
const { syncLeaderboardProfile } = require("../services/leaderboardService");

async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.userId)
      .populate("groupId", "name ownerUserId memberUserIds")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function addHydrationCredits(req, res) {
  try {
    const { userId } = req.params;
    const creditsToAdd = Number(req.body.credits ?? 1);

    if (!Number.isFinite(creditsToAdd) || creditsToAdd <= 0) {
      return res.status(400).json({ error: "credits must be a positive number" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          hydrationCredits: creditsToAdd
        }
      },
      {
        new: true
      }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await syncLeaderboardProfile(user._id);

    return res.json(user);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function awardSessionCompletionCredits(userId, credits = 1) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        hydrationCredits: credits,
        completedSessions: 1
      }
    },
    {
      new: true
    }
  );

  if (user) {
    await syncLeaderboardProfile(user._id);
  }

  return user;
}

module.exports = {
  getUserById,
  addHydrationCredits,
  awardSessionCompletionCredits
};
