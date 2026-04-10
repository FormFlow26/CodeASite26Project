import express from 'express';
import { customAlphabet } from 'nanoid';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { userRateLimit } from '../middleware/rateLimiter.js';
import { getRedis } from '../config/redis.js';
import {
  leaderboardKey,
  roomStateKey,
  getLeaderboard,
} from '../utils/scoreUtils.js';
import { getCachedUser, cacheUser } from '../socket/handlers/gameHandlers.js';

const router = express.Router();

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 6);

const TTL_SECONDS = 24 * 60 * 60;

const createRoomLimiter = userRateLimit(10, 60 * 1000, 'CREATE_ROOM_RATE_LIMITED');

function summarizeRoom(room, topScore = 0) {
  return {
    id: String(room._id),
    code: room.code,
    name: room.name,
    exercise: room.exercise,
    maxPlayers: room.maxPlayers,
    totalSets: room.totalSets,
    repsPerSet: room.repsPerSet,
    playerCount: Array.isArray(room.players) ? room.players.length : 0,
    players: (room.players || []).map((p) => ({
      userId: String(p.userId),
      displayName: p.displayName,
      avatarColor: p.avatarColor,
    })),
    topScore,
    status: room.status,
    createdBy: room.createdBy
      ? typeof room.createdBy === 'object' && room.createdBy.displayName
        ? { id: String(room.createdBy._id), displayName: room.createdBy.displayName }
        : { id: String(room.createdBy) }
      : null,
    createdAt: room.createdAt,
  };
}

async function getTopScore(redis, roomId) {
  try {
    const top = await redis.zrevrange(leaderboardKey(roomId), 0, 0, 'WITHSCORES');
    if (top && top.length >= 2) return Number(top[1]);
  } catch (err) {
    console.error('top score fetch failed:', err.message);
  }
  return 0;
}

// GET /api/rooms — list active rooms
router.get('/', async (req, res) => {
  try {
    const redis = getRedis();
    const rooms = await Room.getActiveRooms();
    const out = await Promise.all(
      rooms.map(async (room) => {
        const top = await getTopScore(redis, room._id);
        return summarizeRoom(room, top);
      })
    );
    return res.json(out);
  } catch (err) {
    console.error('list rooms error:', err);
    return res.status(500).json({ error: 'Failed to list rooms', code: 'LIST_ROOMS_FAILED' });
  }
});

// GET /api/rooms/:roomId/leaderboard
router.get('/:roomId/leaderboard', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const redis = getRedis();
    const leaderboard = await getLeaderboard(redis, roomId);

    const enriched = await Promise.all(
      leaderboard.map(async (entry) => {
        let cached = getCachedUser(entry.userId);
        if (!cached) {
          const user = await User.findById(entry.userId).lean();
          if (user) {
            cached = {
              displayName: user.displayName,
              avatarColor: user.avatar?.color || '#4f9eff',
            };
            cacheUser(entry.userId, cached.displayName, cached.avatarColor);
          }
        }
        return {
          rank: entry.rank,
          userId: entry.userId,
          displayName: cached?.displayName || 'Unknown',
          avatarColor: cached?.avatarColor || '#4f9eff',
          score: entry.score,
        };
      })
    );

    return res.json({ leaderboard: enriched });
  } catch (err) {
    console.error('leaderboard fetch error:', err);
    return res.status(500).json({
      error: 'Failed to fetch leaderboard',
      code: 'LEADERBOARD_FAILED',
    });
  }
});

// GET /api/rooms/:roomId — single room
router.get('/:roomId', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId).populate('createdBy', 'displayName');
    if (!room) {
      return res.status(404).json({ error: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    const redis = getRedis();
    const leaderboard = await getLeaderboard(redis, roomId);
    const top = leaderboard[0]?.score || 0;
    return res.json({
      room: summarizeRoom(room, top),
      leaderboard,
    });
  } catch (err) {
    console.error('get room error:', err);
    return res.status(500).json({ error: 'Failed to fetch room', code: 'GET_ROOM_FAILED' });
  }
});

// POST /api/rooms — create
router.post('/', requireAuth, createRoomLimiter, async (req, res) => {
  try {
    const { name, exercise, maxPlayers, totalSets, repsPerSet } = req.body || {};

    if (!name || typeof name !== 'string' || name.length > 40) {
      return res.status(400).json({ error: 'name is required (max 40 chars)', code: 'INVALID_NAME' });
    }
    if (!['squat', 'deadlift', 'bench', 'ohp'].includes(exercise)) {
      return res.status(400).json({ error: 'invalid exercise', code: 'INVALID_EXERCISE' });
    }

    const redis = getRedis();

    let code = null;
    for (let i = 0; i < 5; i++) {
      const candidate = generateRoomCode();
      const exists = await Room.findOne({ code: candidate }).lean();
      if (!exists) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      return res.status(500).json({
        error: 'Failed to generate unique room code',
        code: 'CODE_GEN_FAILED',
      });
    }

    const creator = req.user;
    const room = new Room({
      code,
      name,
      exercise,
      maxPlayers: maxPlayers || 8,
      totalSets: totalSets || 4,
      repsPerSet: repsPerSet || 8,
      createdBy: creator._id,
      players: [
        {
          userId: creator._id,
          displayName: creator.displayName,
          avatarColor: creator.avatar?.color || '#4f9eff',
          joinedAt: new Date(),
          socketId: null,
        },
      ],
    });
    await room.save();

    // Initialize Redis leaderboard with creator at score 0 + state hash
    await redis.zadd(leaderboardKey(room._id), 'NX', 0, String(creator._id));
    await redis.expire(leaderboardKey(room._id), TTL_SECONDS);
    await redis.hset(roomStateKey(room._id), {
      currentSet: 0,
      phase: 'waiting',
      startedAt: 0,
    });
    await redis.expire(roomStateKey(room._id), TTL_SECONDS);

    cacheUser(String(creator._id), creator.displayName, creator.avatar?.color || '#4f9eff');

    const summary = summarizeRoom(
      { ...room.toObject(), createdBy: { _id: creator._id, displayName: creator.displayName } },
      0
    );

    // Notify lobby
    const io = req.app.get('io');
    if (io) io.emit('room-created', summary);

    return res.status(201).json(summary);
  } catch (err) {
    console.error('create room error:', err);
    return res.status(500).json({ error: 'Failed to create room', code: 'CREATE_ROOM_FAILED' });
  }
});

// POST /api/rooms/join-by-code
router.post('/join-by-code', requireAuth, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required', code: 'INVALID_CODE' });
    }
    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return res.status(404).json({ error: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    if (room.status === 'complete') {
      return res.status(400).json({ error: 'Room is complete', code: 'ROOM_COMPLETE' });
    }
    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: 'Room is full', code: 'ROOM_FULL' });
    }

    const userIdStr = String(req.user._id);
    const already = room.players.some((p) => String(p.userId) === userIdStr);
    if (!already) {
      room.players.push({
        userId: req.user._id,
        displayName: req.user.displayName,
        avatarColor: req.user.avatar?.color || '#4f9eff',
        joinedAt: new Date(),
        socketId: null,
      });
      await room.save();

      const redis = getRedis();
      await redis.zadd(leaderboardKey(room._id), 'NX', 0, userIdStr);
      await redis.expire(leaderboardKey(room._id), TTL_SECONDS);
    }

    cacheUser(userIdStr, req.user.displayName, req.user.avatar?.color || '#4f9eff');

    const populated = await Room.findById(room._id).populate('createdBy', 'displayName');
    const redis = getRedis();
    const top = await getTopScore(redis, room._id);
    const summary = summarizeRoom(populated, top);

    const io = req.app.get('io');
    if (io) io.emit('room-updated', summary);

    return res.json(summary);
  } catch (err) {
    console.error('join-by-code error:', err);
    return res.status(500).json({ error: 'Failed to join room', code: 'JOIN_FAILED' });
  }
});

// DELETE /api/rooms/:roomId
router.delete('/:roomId', requireAuth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    if (String(room.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the creator can delete this room', code: 'NOT_CREATOR' });
    }
    room.status = 'complete';
    room.endedAt = new Date();
    await room.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(roomId)).emit('room-ended', { roomId: String(roomId) });
      io.emit('room-updated', summarizeRoom(room, 0));
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('delete room error:', err);
    return res.status(500).json({ error: 'Failed to delete room', code: 'DELETE_ROOM_FAILED' });
  }
});

export default router;
