import jwt from 'jsonwebtoken';
import { roomHandlers } from './handlers/roomHandlers.js';
import { gameHandlers } from './handlers/gameHandlers.js';
import { User } from '../models/User.js';
import { Room } from '../models/Room.js';
import { getRedis } from '../config/redis.js';
import {
  setDoneKey,
  getActivePlayerCount,
  getLeaderboard,
} from '../utils/scoreUtils.js';

export function initSocketManager(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).lean();
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(
      `Socket connected: ${socket.id} | User: ${socket.user.displayName}`
    );

    roomHandlers(io, socket);
    gameHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
      handleDisconnect(io, socket).catch((err) =>
        console.error('handleDisconnect threw:', err)
      );
    });
  });
}

async function handleDisconnect(io, socket) {
  try {
    const redis = getRedis();
    const userId = socket.user?._id;

    // 1. Find any room where this socket is a player
    const rooms = await Room.find({ 'players.socketId': socket.id });

    for (const room of rooms) {
      const roomId = String(room._id);

      // 2. Remove this player from Room.players via $pull
      await Room.updateOne(
        { _id: room._id },
        { $pull: { players: { socketId: socket.id } } }
      );

      // 3. Notify the room
      io.to(roomId).emit('player-left', {
        userId: userId ? String(userId) : null,
      });

      // Build a fresh summary to broadcast lobby update
      const refreshed = await Room.findById(room._id);
      if (refreshed) {
        // 4. Lobby update
        io.emit('room-updated', {
          id: String(refreshed._id),
          code: refreshed.code,
          name: refreshed.name,
          exercise: refreshed.exercise,
          maxPlayers: refreshed.maxPlayers,
          totalSets: refreshed.totalSets,
          repsPerSet: refreshed.repsPerSet,
          playerCount: refreshed.players.length,
          status: refreshed.status,
          createdAt: refreshed.createdAt,
        });

        // 5. For every active set counter, recheck completion against the new
        // active player count so disconnects don't deadlock the room.
        try {
          let cursor = '0';
          const pattern = `ff:room:${roomId}:set:*:done`;
          const counterKeys = [];
          do {
            const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 50);
            cursor = next;
            counterKeys.push(...batch);
          } while (cursor !== '0');

          const activeCount = await getActivePlayerCount(roomId);

          for (const key of counterKeys) {
            const counter = Number(await redis.get(key));
            // Extract setNumber from key like ff:room:{id}:set:{N}:done
            const match = key.match(/:set:(\d+):done$/);
            if (!match) continue;
            const setNumber = Number(match[1]);

            if (counter >= activeCount && activeCount > 0) {
              if (setNumber >= refreshed.totalSets) {
                // Final set already satisfied — emit game-over
                const leaderboard = await getLeaderboard(redis, roomId);
                io.to(roomId).emit('game-over', {
                  leaderboard,
                  winner: leaderboard[0]
                    ? { userId: leaderboard[0].userId, score: leaderboard[0].score }
                    : null,
                  roomSummary: {
                    id: roomId,
                    code: refreshed.code,
                    name: refreshed.name,
                    status: 'complete',
                  },
                });
                refreshed.status = 'complete';
                refreshed.endedAt = new Date();
                await refreshed.save();
              } else {
                io.to(roomId).emit('next-set-ready', { nextSet: setNumber + 1 });
              }
            }
          }
        } catch (innerErr) {
          console.error('disconnect set-recheck error:', innerErr.message);
        }

        // 6. If room is now empty AND waiting, mark complete to avoid orphans
        if (refreshed.players.length === 0 && refreshed.status === 'waiting') {
          refreshed.status = 'complete';
          refreshed.endedAt = new Date();
          await refreshed.save();
          io.emit('room-updated', {
            id: String(refreshed._id),
            code: refreshed.code,
            status: 'complete',
            playerCount: 0,
          });
        }

        // 7. Host disconnect during active session
        if (
          userId &&
          String(refreshed.createdBy) === String(userId) &&
          refreshed.status === 'active'
        ) {
          io.to(roomId).emit('host-disconnected', {
            roomId,
            message: 'Host has disconnected',
          });
        }
      }
    }
  } catch (err) {
    console.error('handleDisconnect error:', err);
  }
}
