const Session = require("../models/Session");
const User = require("../models/User");
const FriendPool = require("../models/FriendPool");
const { awardSessionCompletionCredits } = require("./userController");
const buildWipeoutPayload = require("../utils/buildWipeoutPayload");
const { updateLeaderboardFromSession } = require("../services/leaderboardService");

async function ensureSessionGroupId(sessionPayload) {
  if (sessionPayload.groupId || !sessionPayload.userId) {
    return sessionPayload.groupId || null;
  }

  const user = await User.findById(sessionPayload.userId);
  if (!user) {
    return null;
  }

  if (user.groupId) {
    sessionPayload.groupId = user.groupId;
    return sessionPayload.groupId;
  }

  const friendPool = await FriendPool.create({
    name: `${user.displayName || user.username}'s Squad`,
    ownerUserId: user._id,
    memberUserIds: [user._id],
  });

  user.groupId = friendPool._id;
  await user.save();
  sessionPayload.groupId = friendPool._id;
  return sessionPayload.groupId;
}

async function getSessionById(req, res) {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate("userId", "username hydrationCredits completedSessions")
      .populate("groupId", "name")
      .lean();

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({
      sessionId: session._id,
      exerciseType: session.exerciseType,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      user: session.userId,
      group: session.groupId,
      summary: session.sessionSummary,
      poseSnapshots: (session.poseSnapshots || []).map((snapshot) => ({
        timestamp: snapshot.timestamp,
        fluidityScore: snapshot.fluidityScore,
        kinkDetected: snapshot.kinkDetected,
      })),
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function createSession(req, res) {
  try {
    const sessionPayload = { ...req.body };
    await ensureSessionGroupId(sessionPayload);

    if (!sessionPayload.groupId) {
      return res.status(400).json({ error: "groupId is required to create a session" });
    }

    const session = await Session.create(sessionPayload);
    const io = req.app.get("io");
    const wipeoutEvent = buildWipeoutPayload(session);

    if (wipeoutEvent.totalKinks > 0 && io) {
      if (session.groupId) {
        io.to(`group:${session.groupId}`).emit("WIPEOUT_EVENT", wipeoutEvent);
      }

      io.emit("WIPEOUT_EVENT", wipeoutEvent);
    }

    return res.status(201).json({
      _id: session._id,
      ...session.toObject(),
      wipeoutEvent: wipeoutEvent.totalKinks > 0 ? wipeoutEvent : null,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function addRep(req, res) {
  try {
    const { sessionId } = req.params;
    const { repNumber, fluidityScore, flags } = req.body;

    const snapshot = {
      timestamp: new Date(),
      fluidityScore: Number(fluidityScore) || 0,
      kinkDetected: Array.isArray(flags) && flags.length > 0,
    };

    const session = await Session.findByIdAndUpdate(
      sessionId,
      { $push: { poseSnapshots: snapshot } },
      { new: false }
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({ buffered: true, repNumber, sessionId });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function flushSet(req, res) {
  try {
    const { sessionId } = req.params;
    const { setNumber } = req.body;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await session.save();

    return res.json({ flushed: true, setNumber, summary: session.sessionSummary });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function completeSession(req, res) {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    session.completedAt = new Date();
    await session.save();
    const updatedUser = await awardSessionCompletionCredits(session.userId);
    const leaderboardEntry = await updateLeaderboardFromSession(session, updatedUser);

    const io = req.app.get("io");

    if (session.sessionSummary.totalKinks > 0 && io) {
      const wipeoutPayload = buildWipeoutPayload(session);

      if (session.groupId) {
        io.to(`group:${session.groupId}`).emit("WIPEOUT_EVENT", wipeoutPayload);
      }

      io.emit("WIPEOUT_EVENT", wipeoutPayload);
    }

    return res.json({
      ...session.toObject(),
      user: updatedUser,
      leaderboard: leaderboardEntry,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getSessionById,
  createSession,
  addRep,
  flushSet,
  completeSession,
};
