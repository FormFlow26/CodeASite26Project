import { getRedis } from '../../config/redis.js';
import { Room } from '../../models/Room.js';
import { User } from '../../models/User.js';
import {
  incrementPlayerScore,
  getLeaderboard,
  getActivePlayerCount,
  playerKey,
  setDoneKey,
  playersDoneKey,
  leaderboardKey,
  roomStateKey,
} from '../../utils/scoreUtils.js';

const TTL_SECONDS = 24 * 60 * 60;

// In-memory user cache: userId (string) → { displayName, avatarColor, cachedAt }
const userCache = new Map();
const USER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function cacheUser(userId, displayName, avatarColor) {
  userCache.set(String(userId), {
    displayName,
    avatarColor,
    cachedAt: Date.now(),
  });
}

export function getCachedUser(userId) {
  const entry = userCache.get(String(userId));
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > USER_CACHE_TTL) {
    userCache.delete(String(userId));
    return null;
  }
  return entry;
}

/**
 * Cache miss → MongoDB lookup → re-populate cache. Always returns something.
 */
async function resolveUser(userId) {
  let cached = getCachedUser(userId);
  if (cached) return cached;
  try {
    const user = await User.findById(userId).select('displayName avatar').lean();
    if (user) {
      const entry = {
        displayName: user.displayName,
        avatarColor: user.avatar?.color || '#4f9eff',
      };
      cacheUser(userId, entry.displayName, entry.avatarColor);
      return entry;
    }
  } catch (err) {
    console.error('resolveUser failed for', userId, err.message);
  }
  return { displayName: 'Unknown', avatarColor: '#4f9eff' };
}

/**
 * Per-room snapshot of leaderboard rank order from the previous broadcast.
 * roomId(string) → Array<{ userId, rank }>
 */
const roomLeaderboardSnapshot = new Map();

async function buildEnrichedLeaderboard(redis, roomId) {
  const leaderboard = await getLeaderboard(redis, roomId);
  const prev = roomLeaderboardSnapshot.get(String(roomId)) || [];
  const prevRanks = new Map(prev.map((e) => [String(e.userId), e.rank]));

  const enriched = await Promise.all(
    leaderboard.map(async (entry) => {
      const user = await resolveUser(entry.userId);
      const prevRank = prevRanks.get(String(entry.userId));
      // Positive delta = moved up (lower rank number is higher)
      const delta = prevRank ? prevRank - entry.rank : 0;
      return {
        rank: entry.rank,
        userId: entry.userId,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        score: entry.score,
        delta,
      };
    })
  );

  roomLeaderboardSnapshot.set(
    String(roomId),
    enriched.map((e) => ({ userId: e.userId, rank: e.rank }))
  );

  return enriched;
}

let heartbeatStarted = false;
function startHeartbeat(io) {
  if (heartbeatStarted) return;
  heartbeatStarted = true;
  setInterval(async () => {
    try {
      const redis = getRedis();
      for (const [roomId] of roomLeaderboardSnapshot) {
        try {
          const leaderboard = await getLeaderboard(redis, roomId);
          if (leaderboard.length > 0) {
            const enriched = await Promise.all(
              leaderboard.map(async (entry) => {
                const user = await resolveUser(entry.userId);
                return {
                  rank: entry.rank,
                  userId: entry.userId,
                  displayName: user.displayName,
                  avatarColor: user.avatarColor,
                  score: entry.score,
                };
              })
            );
            io.to(String(roomId)).emit('ping-scores', {
              leaderboard: enriched,
              timestamp: Date.now(),
            });
          }
        } catch (innerErr) {
          console.error('heartbeat room error:', roomId, innerErr.message);
        }
      }
    } catch (err) {
      console.error('heartbeat error:', err.message);
    }
  }, 10000);
}

export function gameHandlers(io, socket) {
  const redis = getRedis();
  startHeartbeat(io);

  socket.on('rep-complete', async (payload = {}) => {
    try {
      const { roomId, userId, repScore, flags = [], setNumber } = payload;
      if (!roomId || !userId || typeof repScore !== 'number') {
        return socket.emit('error', {
          message: 'Invalid rep-complete payload',
          code: 'INVALID_REP_PAYLOAD',
        });
      }

      await incrementPlayerScore(redis, roomId, userId, repScore);

      // Update streak based on flags (no flags = clean rep, increment streak)
      const pKey = playerKey(roomId, userId);
      const isClean = !flags || flags.length === 0;
      if (isClean) {
        await redis.hincrby(pKey, 'streak', 1);
      } else {
        await redis.hset(pKey, 'streak', 0);
      }
      await redis.hincrby(pKey, 'repsCompleted', 1);
      await redis.hset(pKey, 'lastRepScore', repScore);
      await redis.expire(pKey, TTL_SECONDS);

      const enriched = await buildEnrichedLeaderboard(redis, roomId);

      io.to(String(roomId)).emit('leaderboard-update', {
        leaderboard: enriched,
        setNumber,
      });
    } catch (err) {
      console.error('rep-complete handler error:', err);
      socket.emit('error', { message: 'rep-complete failed', code: 'REP_COMPLETE_FAILED' });
    }
  });

  socket.on('set-complete', async (payload = {}) => {
    try {
      const { roomId, userId, setNumber, setScore, avgFluidity } = payload;
      if (!roomId || !userId || typeof setNumber !== 'number') {
        return socket.emit('error', {
          message: 'Invalid set-complete payload',
          code: 'INVALID_SET_PAYLOAD',
        });
      }

      // Persist this player's set result
      const pKey = playerKey(roomId, userId);
      await redis.hset(pKey, {
        [`set:${setNumber}:score`]: setScore || 0,
        [`set:${setNumber}:avgFluidity`]: avgFluidity || 0,
      });
      await redis.expire(pKey, TTL_SECONDS);

      // Increment the set-complete counter
      const counterKey = setDoneKey(roomId, setNumber);
      const counter = await redis.incr(counterKey);
      if (counter === 1) {
        await redis.expire(counterKey, TTL_SECONDS);
      }

      // Live count from MongoDB — never use cached
      const activeCount = await getActivePlayerCount(roomId);

      const enriched = await buildEnrichedLeaderboard(redis, roomId);
      io.to(String(roomId)).emit('set-complete-ack', {
        userId,
        setNumber,
        leaderboard: enriched,
        completedCount: counter,
        activeCount,
      });

      if (counter >= activeCount && activeCount > 0) {
        // Check if this was the final set
        const room = await Room.findById(roomId).select('totalSets').lean();
        const totalSets = room?.totalSets || 0;

        if (setNumber >= totalSets) {
          // All sets done — game-over will be triggered by session-complete
          io.to(String(roomId)).emit('all-sets-complete', { setNumber });
        } else {
          // Schedule next set after a 5-second countdown
          setTimeout(() => {
            io.to(String(roomId)).emit('next-set-ready', { nextSet: setNumber + 1 });
          }, 5000);
        }
      }
    } catch (err) {
      console.error('set-complete handler error:', err);
      socket.emit('error', { message: 'set-complete failed', code: 'SET_COMPLETE_FAILED' });
    }
  });

  socket.on('session-complete', async (payload = {}) => {
    try {
      const { roomId, userId, totalScore, finalGrade } = payload;
      if (!roomId || !userId) {
        return socket.emit('error', {
          message: 'Invalid session-complete payload',
          code: 'INVALID_SESSION_PAYLOAD',
        });
      }

      // Mark this player as done
      const pKey = playerKey(roomId, userId);
      await redis.hset(pKey, 'done', 1, 'finalScore', totalScore || 0, 'finalGrade', finalGrade || 'F');
      await redis.expire(pKey, TTL_SECONDS);

      const doneKey = playersDoneKey(roomId);
      const doneCount = await redis.incr(doneKey);
      if (doneCount === 1) {
        await redis.expire(doneKey, TTL_SECONDS);
      }

      const activeCount = await getActivePlayerCount(roomId);

      if (doneCount >= activeCount && activeCount > 0) {
        // Compile final leaderboard
        const enriched = await buildEnrichedLeaderboard(redis, roomId);
        const winnerEntry = enriched[0];
        let winner = null;
        if (winnerEntry) {
          winner = {
            userId: winnerEntry.userId,
            displayName: winnerEntry.displayName,
            score: winnerEntry.score,
          };
        }

        // Update Room status
        const room = await Room.findById(roomId);
        if (room) {
          room.status = 'complete';
          room.endedAt = new Date();
          await room.save();
        }

        const roomSummary = room
          ? {
              id: String(room._id),
              code: room.code,
              name: room.name,
              exercise: room.exercise,
              status: room.status,
              totalSets: room.totalSets,
              repsPerSet: room.repsPerSet,
              endedAt: room.endedAt,
            }
          : null;

        io.to(String(roomId)).emit('game-over', {
          leaderboard: enriched,
          winner,
          roomSummary,
        });

        // Clean snapshot — game is over
        roomLeaderboardSnapshot.delete(String(roomId));
      } else {
        // Acknowledge to the room that one player has finished
        io.to(String(roomId)).emit('player-finished', {
          userId,
          doneCount,
          activeCount,
        });
      }
    } catch (err) {
      console.error('session-complete handler error:', err);
      socket.emit('error', { message: 'session-complete failed', code: 'SESSION_COMPLETE_FAILED' });
    }
  });
}
