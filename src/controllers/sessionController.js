const Session = require("../models/Session");
const { awardSessionCompletionCredits } = require("./userController");
const buildWipeoutPayload = require("../utils/buildWipeoutPayload");

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
    const session = await Session.create(req.body);
    const updatedUser = await awardSessionCompletionCredits(session.userId);
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
