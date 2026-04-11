const FriendPool = require("../models/FriendPool");
const User = require("../models/User");

async function bootstrapDemoContext(_req, res) {
  try {
    let user = await User.findOne({ username: "demo-athlete" });
    if (!user) {
      user = await User.create({ username: "demo-athlete" });
    }

    let group = await FriendPool.findOne({ name: "demo-pool", ownerUserId: user._id });
    if (!group) {
      group = await FriendPool.create({
        name: "demo-pool",
        ownerUserId: user._id,
        memberUserIds: [user._id]
      });
    }

    return res.json({
      userId: String(user._id),
      groupId: String(group._id),
      username: user.username,
      groupName: group.name,
      exerciseType: "squat",
      targetSets: 2,
      repsPerSet: 4
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  bootstrapDemoContext
};
