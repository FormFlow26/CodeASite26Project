const mongoose = require("mongoose");

const Session = require("../models/Session");
const { awardSessionCompletionCredits } = require("./userController");
const { emitWipeoutEvent } = require("../services/changeStreamService");

const SUPPORTED_EXERCISES = new Set(["squat", "deadlift", "bench", "ohp"]);

function parsePositiveNumber(value, fallback = 0) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return fallback;
  }

  return parsedValue;
}

function validateObjectId(value, fieldName) {
  if (!mongoose.isValidObjectId(value)) {
    const error = new Error(`${fieldName} must be a valid ObjectId`);
    error.statusCode = 400;
    throw error;
  }
}

function ensureActiveSession(session) {
  if (!session) {
    const error = new Error("Session not found");
    error.statusCode = 404;
    throw error;
  }

  if (session.status === "completed") {
    const error = new Error("Session has already been completed");
    error.statusCode = 409;
    throw error;
  }
}

function buildSessionProgress(session) {
  return {
    status: session.status,
    totalScore: session.totalScore,
    totalReps: session.reps.length,
    completedSets: session.sets.length,
    currentSetNumber: session.sets.length + 1,
    sessionSummary: session.sessionSummary
  };
}

function buildSessionResponse(session, extra = {}) {
  return {
    sessionId: String(session._id),
    session,
    progress: buildSessionProgress(session),
    ...extra
  };
}

async function createSession(req, res) {
  try {
    const {
      userId,
      groupId,
      exerciseType,
      targetSets = 0,
      repsPerSet = 0
    } = req.body || {};

    validateObjectId(userId, "userId");
    validateObjectId(groupId, "groupId");

    if (!SUPPORTED_EXERCISES.has(exerciseType)) {
      return res.status(400).json({ error: "Unsupported exerciseType" });
    }

    const session = await Session.create({
      userId,
      groupId,
      exerciseType,
      targetSets: parsePositiveNumber(targetSets, 0),
      repsPerSet: parsePositiveNumber(repsPerSet, 0),
      status: "active",
      reps: [],
      sets: [],
      poseSnapshots: [],
      totalScore: 0
    });

    return res.status(201).json(buildSessionResponse(session));
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }
}

async function appendRepToSession(req, res) {
  try {
    const { sessionId } = req.params;
    const {
      setNumber,
      repNumber,
      fluidityScore,
      angles = {},
      flags = [],
      points = 0,
      durationMs = 0,
      snapshots = []
    } = req.body || {};

    validateObjectId(sessionId, "sessionId");

    const session = await Session.findById(sessionId);
    ensureActiveSession(session);

    const uniqueFlags = Array.isArray(flags) ? Array.from(new Set(flags.filter(Boolean))) : [];
    const normalizedSnapshots = Array.isArray(snapshots) ? snapshots : [];

    session.reps.push({
      setNumber: parsePositiveNumber(setNumber, 1),
      repNumber: parsePositiveNumber(repNumber, session.reps.length + 1),
      fluidityScore: parsePositiveNumber(fluidityScore, 0),
      angles,
      flags: uniqueFlags,
      points: parsePositiveNumber(points, 0),
      durationMs: parsePositiveNumber(durationMs, 0),
      kinkDetected: uniqueFlags.length > 0 || normalizedSnapshots.some((snapshot) => snapshot?.kinkDetected)
    });

    session.poseSnapshots.push(...normalizedSnapshots);
    session.totalScore += parsePositiveNumber(points, 0);

    await session.save();

    const kinkSnapshots = session.poseSnapshots.filter((snapshot) => {
      if (!snapshot.kinkDetected) {
        return false;
      }

      return normalizedSnapshots.some(
        (incomingSnapshot) => incomingSnapshot?.timestamp && new Date(incomingSnapshot.timestamp).getTime() === new Date(snapshot.timestamp).getTime()
      );
    });

    if (kinkSnapshots.length > 0) {
      emitWipeoutEvent(req.app.get("io"), session, kinkSnapshots);
    }

    return res.json(
      buildSessionResponse(session, {
        rep: session.reps[session.reps.length - 1]
      })
    );
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }
}

async function flushSet(req, res) {
  try {
    const { sessionId } = req.params;
    const { setNumber } = req.body || {};

    validateObjectId(sessionId, "sessionId");

    const session = await Session.findById(sessionId);
    ensureActiveSession(session);

    const parsedSetNumber = parsePositiveNumber(setNumber, session.sets.length + 1);
    const repsCompleted = session.reps.filter((rep) => rep.setNumber === parsedSetNumber).length;

    const existingSet = session.sets.find((setSummary) => setSummary.setNumber === parsedSetNumber);
    if (!existingSet) {
      session.sets.push({
        setNumber: parsedSetNumber,
        repsCompleted
      });
      await session.save();
    }

    return res.json(
      buildSessionResponse(session, {
        set: session.sets.find((setSummary) => setSummary.setNumber === parsedSetNumber) || null
      })
    );
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }
}

async function completeSession(req, res) {
  try {
    const { sessionId } = req.params;
    const { totalScore = 0, sets = [] } = req.body || {};

    validateObjectId(sessionId, "sessionId");

    const session = await Session.findById(sessionId);
    ensureActiveSession(session);

    const incomingSets = Array.isArray(sets) ? sets : [];
    for (const incomingSet of incomingSets) {
      const parsedSetNumber = parsePositiveNumber(incomingSet.setNumber, 0);
      if (!parsedSetNumber) {
        continue;
      }

      const existingSet = session.sets.find((setSummary) => setSummary.setNumber === parsedSetNumber);
      if (!existingSet) {
        session.sets.push({
          setNumber: parsedSetNumber,
          repsCompleted: parsePositiveNumber(incomingSet.repsCompleted, 0)
        });
      }
    }

    session.totalScore = parsePositiveNumber(totalScore, session.totalScore);
    session.status = "completed";
    session.completedAt = new Date();

    await session.save();
    const updatedUser = await awardSessionCompletionCredits(session.userId);

    return res.json(
      buildSessionResponse(session, {
        user: updatedUser
      })
    );
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }
}

module.exports = {
  createSession,
  appendRepToSession,
  flushSet,
  completeSession,
  buildSessionResponse
};
