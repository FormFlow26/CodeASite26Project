import mongoose from 'mongoose';

const AVATAR_COLORS = [
  '#4f9eff',
  '#00d4ff',
  '#00b894',
  '#ffa502',
  '#ff6b9d',
  '#a29bfe',
  '#fd79a8',
  '#e17055',
];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function computeInitials(displayName) {
  if (!displayName) return '';
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0].toUpperCase());
  return letters.join('').slice(0, 2);
}

const userSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 20,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  avatar: {
    color: { type: String, default: randomAvatarColor },
    initials: { type: String },
  },
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalReps: { type: Number, default: 0 },
    bestFluidityScore: { type: Number, default: 0 },
    lifetimeScore: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function (next) {
  if (this.isModified('displayName') || !this.avatar?.initials) {
    if (!this.avatar) this.avatar = {};
    this.avatar.initials = computeInitials(this.displayName);
  }
  if (!this.avatar?.color) {
    this.avatar.color = randomAvatarColor();
  }
  next();
});

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model('User', userSchema);
