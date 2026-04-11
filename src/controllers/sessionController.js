const Session = require("../models/Session");
const User = require("../models/User");
const { awardSessionCompletionCredits } = require("./userController");
const buildWipeoutPayload = require("../utils/buildWipeoutPayload");
const { updateLeaderboardFromSession } = require("../services/leaderboardService");

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

    if (!sessionPayload.groupId && sessionPayload.userId) {
      const user = await User.findById(sessionPayload.userId).select("groupId").lean();
      if (user?.groupId) {
        sessionPayload.groupId = user.groupId;
      }
    }

    if (!sessionPayload.groupId) {
      return res.status(400).json({ error: "groupId is required to create a session" });
    }

    const session = await Session.create(sessionPayload);
    const updatedUser = await awardSessionCompletionCredits(session.userId);
    const leaderboardEntry = await updateLeaderboardFromSession(session, updatedUser);
    const io = req.app.get("io");
    const wipeoutEvent = buildWipeoutPayload(session);

    if (wipeoutEvent.totalKinks > 0 && io) {
      if (session.groupId) {
        io.to(`group:${session.groupId}`).emit("WIPEOUT_EVENT", wipeoutEvent);
      }

      io.emit("WIPEOUT_EVENT", wipeoutEvent);
    }

    return res.status(201).json({
      session,
      user: updatedUser,
      leaderboard: leaderboardEntry,
      wipeoutEvent: wipeoutEvent.totalKinks > 0 ? wipeoutEvent : null,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getSessionById,
  createSession
};
