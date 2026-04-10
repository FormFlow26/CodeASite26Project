import mongoose from 'mongoose';

const repSchema = new mongoose.Schema(
  {
    repNumber: Number,
    fluidityScore: Number,
    angles: {
      hipAngle: Number,
      kneeAngle: Number,
      lumbarFlexion: Number,
    },
    flags: [String],
    points: Number,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const setSchema = new mongoose.Schema(
  {
    setNumber: Number,
    reps: { type: [repSchema], default: [] },
    setScore: Number,
    avgFluidity: Number,
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  exercise: String,
  totalScore: { type: Number, default: 0 },
  sets: { type: [setSchema], default: [] },
  finalGrade: String,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ roomId: 1 });

export const Session = mongoose.model('Session', sessionSchema);
