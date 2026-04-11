const mongoose = require("mongoose");

const leaderboardEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      unique: true,
      index: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      trim: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      trim: true
    },
    hydrationCredits: {
      type: Number,
      default: 0,
      min: 0,
      min: 0
    },
    highestFluidityScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    latestExerciseType: {
      type: String,
      default: "",
      min: 0
    },
    latestExerciseType: {
      type: String,
      default: ""
    },
    sessionsCompleted: {
      type: Number,
      default: 0,
      min: 0,
      min: 0
    },
    totalKinks: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
      min: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

leaderboardEntrySchema.index({ highestFluidityScore: -1, sessionsCompleted: -1 });

module.exports = mongoose.model("LeaderboardEntry", leaderboardEntrySchema);
