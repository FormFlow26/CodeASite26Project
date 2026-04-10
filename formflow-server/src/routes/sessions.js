import express from 'express';
import { Session } from '../models/Session.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { userRateLimit } from '../middleware/rateLimiter.js';
import { getRedis } from '../config/redis.js';
import {
  incrementPlayerScore,
  computeFinalGrade,
} from '../utils/scoreUtils.js';

const router = express.Router();

// 60 PATCH rep requests per minute per user
const repLimiter = userRateLimit(60, 60 * 1000, 'REP_RATE_LIMITED');

/**
 * Module-scope in-memory rep buffer.
 * Map<sessionId(string), Array<repEntry>>
 * Each entry: { setNumber, repNumber, fluidityScore, angles, flags, points, timestamp }
 *
 * Reps are accumulated here on each PATCH and only flushed to MongoDB when
 * a set is complete or the session is finalized.
 */
const sessionRepBuffer = new Map();

function bufferRep(sessionId, rep) {
  const key = String(sessionId);
  const arr = sessionRepBuffer.get(key) || [];
  arr.push(rep);
  sessionRepBuffer.set(key, arr);
}

function takeRepsForSet(sessionId, setNumber) {
  const key = String(sessionId);
  const arr = sessionRepBuffer.get(key) || [];
  const matching = arr.filter((r) => r.setNumber === setNumber);
  const remaining = arr.filter((r) => r.setNumber !== setNumber);
  if (remaining.length === 0) sessionRepBuffer.delete(key);
  else sessionRepBuffer.set(key, remaining);
  return matching;
}

function takeAllReps(sessionId) {
  const key = String(sessionId);
  const arr = sessionRepBuffer.get(key) || [];
  sessionRepBuffer.delete(key);
  return arr;
}

async function flushSetToMongo(session, setNumber) {
  const reps = takeRepsForSet(session._id, setNumber);
  if (reps.length === 0) return;

  // Build/update the set entry inside session.sets
  const setReps = reps
    .sort((a, b) => a.repNumber - b.repNumber)
    .map((r) => ({
      repNumber: r.repNumber,
      fluidityScore: r.fluidityScore,
      angles: r.angles,
      flags: r.flags || [],
      points: r.points,
      timestamp: r.timestamp || new Date(),
    }));

  const sets = Array.isArray(session.sets) ? [...session.sets] : [];
  let idx = sets.findIndex((s) => s.setNumber === setNumber);
  const totalPoints = setReps.reduce((sum, r) => sum + (r.points || 0), 0);
  const avgFluidity =
    setReps.length > 0
      ? setReps.reduce((sum, r) => sum + (r.fluidityScore || 0), 0) / setReps.length
      : 0;

  const setEntry = {
    setNumber,
    reps: setReps,
    setScore: totalPoints,
    avgFluidity,
  };

  if (idx >= 0) {
    sets[idx] = setEntry;
  } else {
    sets.push(setEntry);
  }
  sets.sort((a, b) => a.setNumber - b.setNumber);

  await Session.updateOne({ _id: session._id }, { $set: { sets } });
}

// POST /api/sessions — create
router.post('/', requireAuth, async (req, res) => {
  try {
    const { roomId, exercise } = req.body || {};
    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required', code: 'INVALID_ROOM' });
    }

    const session = await Session.create({
      roomId,
      userId: req.user._id,
      exercise: exercise || 'squat',
      totalScore: 0,
      sets: [],
    });
    return res.status(201).json({ id: String(session._id), session });
  } catch (err) {
    console.error('create session error:', err);
    return res.status(500).json({ error: 'Failed to create session', code: 'CREATE_SESSION_FAILED' });
  }
});

// PATCH /api/sessions/:sessionId/rep — buffered rep
router.patch('/:sessionId/rep', requireAuth, repLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { setNumber, repNumber, fluidityScore, angles, flags, points } = req.body || {};

    if (
      typeof setNumber !== 'number' ||
      typeof repNumber !== 'number' ||
      typeof points !== 'number'
    ) {
      return res.status(400).json({
        error: 'setNumber, repNumber, and points are required numbers',
        code: 'INVALID_REP_PAYLOAD',
      });
    }

    const session = await Session.findById(sessionId).select('_id roomId userId').lean();
    if (!session) {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    if (String(session.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your session', code: 'NOT_OWNER' });
    }

    const redis = getRedis();
    const totalScore = await incrementPlayerScore(
      redis,
      session.roomId,
      req.user._id,
      points
    );

    bufferRep(sessionId, {
      setNumber,
      repNumber,
      fluidityScore: fluidityScore || 0,
      angles: angles || {},
      flags: flags || [],
      points,
      timestamp: new Date(),
    });

    return res.json({ buffered: true, repNumber, totalScore });
  } catch (err) {
    console.error('rep buffer error:', err);
    return res.status(500).json({ error: 'Failed to buffer rep', code: 'REP_FAILED' });
  }
});

// POST /api/sessions/:sessionId/flush-set
router.post('/:sessionId/flush-set', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { setNumber } = req.body || {};
    if (typeof setNumber !== 'number') {
      return res.status(400).json({ error: 'setNumber is required', code: 'INVALID_SET' });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    if (String(session.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your session', code: 'NOT_OWNER' });
    }

    await flushSetToMongo(session, setNumber);
    return res.json({ flushed: true });
  } catch (err) {
    console.error('flush-set error:', err);
    return res.status(500).json({ error: 'Failed to flush set', code: 'FLUSH_FAILED' });
  }
});

// POST /api/sessions/:sessionId/complete
router.post('/:sessionId/complete', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { totalScore, sets } = req.body || {};

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    if (String(session.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not your session', code: 'NOT_OWNER' });
    }

    // Flush any remaining buffered reps for this session
    const remaining = takeAllReps(sessionId);
    if (remaining.length > 0) {
      const grouped = new Map();
      for (const r of remaining) {
        if (!grouped.has(r.setNumber)) grouped.set(r.setNumber, []);
        grouped.get(r.setNumber).push(r);
      }
      const merged = Array.isArray(session.sets) ? [...session.sets] : [];
      for (const [setNumber, reps] of grouped.entries()) {
        const setReps = reps
          .sort((a, b) => a.repNumber - b.repNumber)
          .map((r) => ({
            repNumber: r.repNumber,
            fluidityScore: r.fluidityScore,
            angles: r.angles,
            flags: r.flags || [],
            points: r.points,
            timestamp: r.timestamp || new Date(),
          }));
        const totalPoints = setReps.reduce((s, r) => s + (r.points || 0), 0);
        const avgFluidity =
          setReps.length > 0
            ? setReps.reduce((s, r) => s + (r.fluidityScore || 0), 0) / setReps.length
            : 0;
        const setEntry = { setNumber, reps: setReps, setScore: totalPoints, avgFluidity };
        const idx = merged.findIndex((s) => s.setNumber === setNumber);
        if (idx >= 0) merged[idx] = setEntry;
        else merged.push(setEntry);
      }
      merged.sort((a, b) => a.setNumber - b.setNumber);
      session.sets = merged;
    }

    // Allow client-supplied sets to override (final authoritative version)
    if (Array.isArray(sets) && sets.length > 0) {
      session.sets = sets;
    }

    // Compute totals
    const computedTotal =
      typeof totalScore === 'number'
        ? totalScore
        : (session.sets || []).reduce((sum, s) => sum + (s.setScore || 0), 0);
    session.totalScore = computedTotal;

    // Look up room for max possible score
    const room = await Room.findById(session.roomId).select('totalSets repsPerSet').lean();
    const maxPossibleScore =
      room && room.totalSets && room.repsPerSet
        ? room.totalSets * room.repsPerSet * 100
        : (session.sets || []).reduce(
            (acc, s) => acc + (Array.isArray(s.reps) ? s.reps.length * 100 : 0),
            0
          );

    session.finalGrade = computeFinalGrade(computedTotal, maxPossibleScore);
    session.completedAt = new Date();
    await session.save();

    // Update User stats
    const totalReps = (session.sets || []).reduce(
      (acc, s) => acc + (Array.isArray(s.reps) ? s.reps.length : 0),
      0
    );
    const bestFluidity = (session.sets || []).reduce(
      (best, s) => Math.max(best, s.avgFluidity || 0),
      0
    );
    await User.updateOne(
      { _id: req.user._id },
      {
        $inc: {
          'stats.totalSessions': 1,
          'stats.totalReps': totalReps,
          'stats.lifetimeScore': computedTotal,
        },
        $max: { 'stats.bestFluidityScore': bestFluidity },
      }
    );

    return res.json({ session, finalGrade: session.finalGrade });
  } catch (err) {
    console.error('complete session error:', err);
    return res.status(500).json({ error: 'Failed to complete session', code: 'COMPLETE_FAILED' });
  }
});

export default router;
