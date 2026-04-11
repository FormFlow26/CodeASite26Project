const mongoose = require("mongoose");
const SNAPSHOT_INTERVAL_MS = 500;

const poseSnapshotSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    fluidityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    kinkDetected: {
      type: Boolean,
      required: true,
      default: false
    }
  },
  {
    _id: false
  }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "FriendPool",
      index: true
    },
    exerciseType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    poseSnapshots: {
      type: [poseSnapshotSchema],
      default: []
    },
    sessionSummary: {
      averageFluidity: {
        type: Number,
        default: 0
      },
      totalKinks: {
        type: Number,
        default: 0
      },
      maxFluidity: {
        type: Number,
        default: 0
      }
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Supports fast lookup of a user's recent sessions by exercise type.
sessionSchema.index({ userId: 1, exerciseType: 1, createdAt: -1 });
sessionSchema.index({ groupId: 1, createdAt: -1 });

function filterPoseSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return [];
  }

  const sortedSnapshots = [...snapshots].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
  const filteredSnapshots = [];
  let lastStoredTimestamp = null;

  for (const snapshot of sortedSnapshots) {
    const currentTimestamp = new Date(snapshot.timestamp).getTime();

    if (
      snapshot.kinkDetected ||
      lastStoredTimestamp === null ||
      currentTimestamp - lastStoredTimestamp >= SNAPSHOT_INTERVAL_MS
    ) {
      filteredSnapshots.push(snapshot);
      lastStoredTimestamp = currentTimestamp;
    }
  }

  return filteredSnapshots;
}

sessionSchema.pre("save", function preparePoseSnapshots(next) {
  this.poseSnapshots = filterPoseSnapshots(this.poseSnapshots || []);
  next();
});

sessionSchema.pre("save", function calculateSessionSummary(next) {
  const snapshots = this.poseSnapshots || [];

  if (snapshots.length === 0) {
    this.sessionSummary = {
      averageFluidity: 0,
      totalKinks: 0,
      maxFluidity: 0
    };
    return next();
  }

  let totalFluidity = 0;
  let totalKinks = 0;
  let maxFluidity = 0;

  for (const snapshot of snapshots) {
    totalFluidity += snapshot.fluidityScore;

    if (snapshot.kinkDetected) {
      totalKinks += 1;
    }

    if (snapshot.fluidityScore > maxFluidity) {
      maxFluidity = snapshot.fluidityScore;
    }
  }

  this.sessionSummary = {
    averageFluidity: totalFluidity / snapshots.length,
    totalKinks,
    maxFluidity
  };

  next();
});

module.exports = mongoose.model("Session", sessionSchema);
