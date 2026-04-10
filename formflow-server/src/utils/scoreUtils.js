import { Room } from '../models/Room.js';

const KEY_PREFIX = 'ff:';
const TTL_SECONDS = 24 * 60 * 60;

export function leaderboardKey(roomId) {
  return `${KEY_PREFIX}leaderboard:${roomId}`;
}

export function roomStateKey(roomId) {
  return `${KEY_PREFIX}room:${roomId}:state`;
}

export function playerKey(roomId, userId) {
  return `${KEY_PREFIX}player:${roomId}:${userId}`;
}

export function setDoneKey(roomId, setNumber) {
  return `${KEY_PREFIX}room:${roomId}:set:${setNumber}:done`;
}

export function playersDoneKey(roomId) {
  return `${KEY_PREFIX}room:${roomId}:players:done`;
}

/**
 * Atomically increment a player's leaderboard score AND their player-hash score field.
 */
export async function incrementPlayerScore(redis, roomId, userId, points) {
  const lbKey = leaderboardKey(roomId);
  const pKey = playerKey(roomId, userId);

  const pipeline = redis.pipeline();
  pipeline.zincrby(lbKey, points, String(userId));
  pipeline.hincrby(pKey, 'score', points);
  pipeline.hset(pKey, 'lastRepScore', points);
  pipeline.expire(lbKey, TTL_SECONDS);
  pipeline.expire(pKey, TTL_SECONDS);
  const results = await pipeline.exec();

  // First result is from zincrby — new total leaderboard score for this user.
  const newTotal = results && results[0] ? Number(results[0][1]) : 0;
  return newTotal;
}

/**
 * Returns leaderboard array of { userId, score, rank }.
 */
export async function getLeaderboard(redis, roomId, userCount = 20) {
  const lbKey = leaderboardKey(roomId);
  const raw = await redis.zrevrange(lbKey, 0, userCount - 1, 'WITHSCORES');
  const leaderboard = [];
  for (let i = 0; i < raw.length; i += 2) {
    leaderboard.push({
      userId: raw[i],
      score: Number(raw[i + 1]),
      rank: Math.floor(i / 2) + 1,
    });
  }
  return leaderboard;
}

/**
 * Deletes leaderboard, room state, and all per-player hashes for a room.
 */
export async function resetRoomLeaderboard(redis, roomId) {
  const lbKey = leaderboardKey(roomId);
  const stateKey = roomStateKey(roomId);
  const playerHashPattern = `${KEY_PREFIX}player:${roomId}:*`;
  const setDonePattern = `${KEY_PREFIX}room:${roomId}:set:*:done`;

  const pipeline = redis.pipeline();
  pipeline.del(lbKey);
  pipeline.del(stateKey);
  pipeline.del(playersDoneKey(roomId));

  // Use scanStream for safety on larger datasets
  const playerKeys = await scanKeys(redis, playerHashPattern);
  for (const k of playerKeys) pipeline.del(k);
  const setKeys = await scanKeys(redis, setDonePattern);
  for (const k of setKeys) pipeline.del(k);

  await pipeline.exec();
}

async function scanKeys(redis, pattern) {
  const found = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    found.push(...batch);
  } while (cursor !== '0');
  return found;
}

/**
 * Live count of active players in the room from MongoDB. Used by set/session
 * completion logic so disconnected players never deadlock the game.
 */
export async function getActivePlayerCount(roomId) {
  const room = await Room.findById(roomId).select('players').lean();
  if (!room) return 0;
  return Array.isArray(room.players) ? room.players.length : 0;
}

/**
 * Letter grade based on score percentage.
 */
export function computeFinalGrade(totalScore, maxPossibleScore) {
  if (!maxPossibleScore || maxPossibleScore <= 0) return 'F';
  const pct = totalScore / maxPossibleScore;
  if (pct >= 0.9) return 'A';
  if (pct >= 0.75) return 'B';
  if (pct >= 0.6) return 'C';
  if (pct >= 0.45) return 'D';
  return 'F';
}
