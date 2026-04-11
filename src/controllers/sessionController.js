const Session = require("../models/Session");
const { awardSessionCompletionCredits } = require("./userController");
const { updateLeaderboardFromSession } = require("../services/leaderboardService");

function serializeSnapshot(snapshot) {
  return {
    timestamp: snapshot.timestamp,
    fluidityScore: snapshot.fluidityScore,
    kinkDetected: snapshot.kinkDetected,
    angles: snapshot.angles || null,
  };
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
      completedAt: session.completedAt,
      updatedAt: session.updatedAt,
      user: session.userId,
      group: session.groupId,
      summary: session.sessionSummary,
      totalScore: session.totalScore,
      poseSnapshots: (session.poseSnapshots || []).map(serializeSnapshot),
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

// Wipeout broadcasts are owned by changeStreamService, which now handles
// inserts as well as updates. createSession only persists the session and
// does not mark the session complete until /complete is called.
async function createSession(req, res) {
  try {
    const session = await Session.create(req.body);

    return res.status(201).json({
      sessionId: session._id,
      session,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function appendRep(req, res) {
  try {
    const { fluidityScore, angles, flags } = req.body || {};

    if (typeof fluidityScore !== "number" || Number.isNaN(fluidityScore)) {
      return res.status(400).json({ error: "fluidityScore must be a number" });
    }

    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const flagList = Array.isArray(flags) ? flags : [];
    session.poseSnapshots.push({
      timestamp: new Date(),
      fluidityScore,
      kinkDetected: flagList.length > 0,
      angles: angles
        ? {
            hipAngle: angles.hipAngle,
            kneeAngle: angles.kneeAngle,
            lumbarFlexion: angles.lumbarFlexion,
          }
        : undefined,
    });

    await session.save();
    return res.json({
      sessionId: session._id,
      summary: session.sessionSummary,
      latestSnapshot: serializeSnapshot(
        session.poseSnapshots[session.poseSnapshots.length - 1] || {}
      ),
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function flushSet(req, res) {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Re-saving runs the pre-save hooks that recompute sessionSummary
    // and resample poseSnapshots, which is the durable side-effect
    // sessionManager.js relies on at set boundaries.
    await session.save();
    return res.json({
      sessionId: session._id,
      setNumber: req.body?.setNumber ?? null,
      summary: session.sessionSummary,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function completeSession(req, res) {
  try {
    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (typeof req.body?.totalScore === "number") {
      session.totalScore = req.body.totalScore;
    }

    const shouldAwardCredits = !session.completedAt;
    if (shouldAwardCredits) {
      session.completedAt = new Date();
    }

    await session.save();
    const updatedUser = shouldAwardCredits
      ? await awardSessionCompletionCredits(session.userId)
      : null;
    const leaderboardEntry = shouldAwardCredits
      ? await updateLeaderboardFromSession(session, updatedUser)
      : null;

    return res.json({
      sessionId: session._id,
      totalScore: session.totalScore,
      completedAt: session.completedAt,
      summary: session.sessionSummary,
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
  appendRep,
  flushSet,
  completeSession,
};
