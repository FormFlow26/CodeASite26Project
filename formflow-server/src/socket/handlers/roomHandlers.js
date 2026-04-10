import { getRedis } from '../../config/redis.js';
import { Room } from '../../models/Room.js';
import {
  leaderboardKey,
  roomStateKey,
  getLeaderboard,
} from '../../utils/scoreUtils.js';
import { cacheUser, getCachedUser } from './gameHandlers.js';

const TTL_SECONDS = 24 * 60 * 60;

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
    createdAt: room.createdAt,
  };
}

export function roomHandlers(io, socket) {
  const redis = getRedis();

  socket.on('join-room', async (payload = {}) => {
    try {
      const { roomId, userId, displayName } = payload;
      if (!roomId || !userId) {
        return socket.emit('error', {
          message: 'roomId and userId required',
          code: 'INVALID_JOIN_PAYLOAD',
        });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit('error', {
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND',
        });
      }

      if (room.status === 'complete') {
        return socket.emit('error', {
          message: 'Room is complete',
          code: 'ROOM_COMPLETE',
        });
      }

      socket.join(String(roomId));

      const userIdStr = String(userId);
      const existingIdx = room.players.findIndex((p) => String(p.userId) === userIdStr);

      if (existingIdx >= 0) {
        // Reconnect: update socketId on the existing player record (no duplicate push)
        await Room.updateOne(
          { _id: roomId, 'players.userId': userId },
          { $set: { 'players.$.socketId': socket.id } }
        );
      } else {
        if (room.players.length >= room.maxPlayers) {
          return socket.emit('error', { message: 'Room is full', code: 'ROOM_FULL' });
        }
        const avatarColor = socket.user?.avatar?.color || '#4f9eff';
        await Room.updateOne(
          { _id: roomId },
          {
            $push: {
              players: {
                userId,
                displayName: displayName || socket.user?.displayName || 'Player',
                avatarColor,
                joinedAt: new Date(),
                socketId: socket.id,
              },
            },
          }
        );
      }

      // Add to Redis leaderboard if not present
      await redis.zadd(leaderboardKey(roomId), 'NX', 0, userIdStr);
      await redis.expire(leaderboardKey(roomId), TTL_SECONDS);

      // Populate the user cache for leaderboard enrichment
      const avatarColor = socket.user?.avatar?.color || '#4f9eff';
      const name = displayName || socket.user?.displayName || 'Player';
      cacheUser(userIdStr, name, avatarColor);

      // Fetch updated room and Redis state
      const updatedRoom = await Room.findById(roomId);
      const leaderboard = await getLeaderboard(redis, roomId);
      const currentState = await redis.hgetall(roomStateKey(roomId));

      socket.emit('room-joined', {
        room: summarizeRoom(updatedRoom),
        leaderboard,
        currentState,
      });

      io.to(String(roomId)).emit('player-joined', {
        player: { userId: userIdStr, displayName: name, avatarColor },
      });

      io.emit('room-updated', summarizeRoom(updatedRoom));
    } catch (err) {
      console.error('join-room error:', err);
      socket.emit('error', { message: 'join-room failed', code: 'JOIN_ROOM_FAILED' });
    }
  });

  socket.on('leave-room', async (payload = {}) => {
    try {
      const { roomId, userId } = payload;
      if (!roomId || !userId) {
        return socket.emit('error', {
          message: 'roomId and userId required',
          code: 'INVALID_LEAVE_PAYLOAD',
        });
      }

      socket.leave(String(roomId));
      await Room.updateOne(
        { _id: roomId },
        { $pull: { players: { userId } } }
      );

      socket.to(String(roomId)).emit('player-left', { userId: String(userId) });

      const updatedRoom = await Room.findById(roomId);
      if (updatedRoom) {
        io.emit('room-updated', summarizeRoom(updatedRoom));
      }
    } catch (err) {
      console.error('leave-room error:', err);
      socket.emit('error', { message: 'leave-room failed', code: 'LEAVE_ROOM_FAILED' });
    }
  });

  socket.on('start-session', async (payload = {}) => {
    try {
      const { roomId } = payload;
      if (!roomId) {
        return socket.emit('error', {
          message: 'roomId required',
          code: 'INVALID_START_PAYLOAD',
        });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
      }
      if (String(room.createdBy) !== String(socket.user._id)) {
        return socket.emit('error', { message: 'Only the host can start', code: 'NOT_HOST' });
      }
      if (room.status !== 'waiting') {
        return socket.emit('error', { message: 'Room is not waiting', code: 'INVALID_STATE' });
      }
      if (room.players.length < 1) {
        return socket.emit('error', { message: 'Need at least 1 player', code: 'NOT_ENOUGH_PLAYERS' });
      }

      const startedAt = Date.now();
      room.status = 'active';
      room.startedAt = new Date(startedAt);
      await room.save();

      await redis.hset(roomStateKey(roomId), {
        phase: 'active',
        currentSet: 1,
        startedAt,
      });
      await redis.expire(roomStateKey(roomId), TTL_SECONDS);

      io.to(String(roomId)).emit('session-started', {
        roomId: String(roomId),
        exercise: room.exercise,
        totalSets: room.totalSets,
        repsPerSet: room.repsPerSet,
        startedAt,
      });

      io.emit('room-updated', summarizeRoom(room));
    } catch (err) {
      console.error('start-session error:', err);
      socket.emit('error', { message: 'start-session failed', code: 'START_SESSION_FAILED' });
    }
  });

  socket.on('request-room-state', async (payload = {}) => {
    try {
      const { roomId } = payload;
      if (!roomId) {
        return socket.emit('error', {
          message: 'roomId required',
          code: 'INVALID_REQUEST',
        });
      }
      const leaderboard = await getLeaderboard(redis, roomId);
      const state = await redis.hgetall(roomStateKey(roomId));
      socket.emit('room-state', { leaderboard, state });
    } catch (err) {
      console.error('request-room-state error:', err);
      socket.emit('error', { message: 'request-room-state failed', code: 'STATE_FETCH_FAILED' });
    }
  });
}
