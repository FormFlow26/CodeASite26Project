import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    displayName: String,
    avatarColor: String,
    joinedAt: { type: Date, default: Date.now },
    socketId: String,
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema({
  code: { type: String, unique: true, length: 6 },
  name: { type: String, required: true, maxlength: 40 },
  exercise: {
    type: String,
    enum: ['squat', 'deadlift', 'bench', 'ohp'],
    required: true,
  },
  maxPlayers: { type: Number, default: 8, min: 2, max: 10 },
  totalSets: { type: Number, default: 4, min: 1, max: 10 },
  repsPerSet: { type: Number, default: 8, min: 3, max: 20 },
  status: {
    type: String,
    enum: ['waiting', 'active', 'complete'],
    default: 'waiting',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  players: { type: [playerSchema], default: [] },
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

// Explicit index declarations
roomSchema.index({ code: 1 }, { unique: true });
roomSchema.index({ status: 1, createdAt: -1 });

roomSchema.statics.getActiveRooms = function () {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.find({
    status: { $ne: 'complete' },
    createdAt: { $gte: dayAgo },
  })
    .sort({ createdAt: -1 })
    .populate('createdBy', 'displayName');
};

export const Room = mongoose.model('Room', roomSchema);
