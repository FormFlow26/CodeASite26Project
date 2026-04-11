const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    hydrationCredits: {
      type: Number,
      default: 0,
      min: 0
    },
    completedSessions: {
      type: Number,
      default: 0,
      min: 0
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
