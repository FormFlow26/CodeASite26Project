const mongoose = require("mongoose");

const SNAPSHOT_INTERVAL_MS = 500;

const angleSchema = new mongoose.Schema(
  {
    hipAngle: {
      type: Number,
      default: 0
    },
    kneeAngle: {
      type: Number,
      default: 0
    },
    lumbarFlexion: {
      type: Number,
      default: 0
    }
  },
  {
    _id: false
  }
);

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
    },
    angles: {
      type: angleSchema,
      default: () => ({})
    },
    flags: {
      type: [String],
      default: []
    }
  },
  {
    _id: false
  }
);

const repSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true,
      min: 1
    },
    repNumber: {
      type: Number,
      required: true,
      min: 1
    },
    fluidityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    angles: {
      type: angleSchema,
      default: () => ({})
    },
    flags: {
      type: [String],
      default: []
    },
    points: {
      type: Number,
      default: 0
    },
    durationMs: {
      type: Number,
      default: 0
    },
    kinkDetected: {
      type: Boolean,
      default: false
    },
    capturedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: false
  }
);

const setSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true,
      min: 1
    },
    repsCompleted: {
      type: Number,
      required: true,
      min: 0
    },
    completedAt: {
      type: Date,
      default: Date.now
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
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true
    },
    totalScore: {
      type: Number,
      default: 0
    },
    targetSets: {
      type: Number,
      default: 0
    },
    repsPerSet: {
      type: Number,
      default: 0
    },
    reps: {
      type: [repSchema],
      default: []
    },
    sets: {
      type: [setSchema],
      default: []
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

sessionSchema.index({ userId: 1, exerciseType: 1, createdAt: -1 });
sessionSchema.index({ groupId: 1, createdAt: -1 });

function normalizeAngleSet(angles = {}) {
  return {
    hipAngle: Number(angles.hipAngle || 0),
    kneeAngle: Number(angles.kneeAngle || 0),
    lumbarFlexion: Number(angles.lumbarFlexion || 0)
  };
}

function normalizeSnapshot(snapshot = {}) {
  return {
    timestamp: snapshot.timestamp ? new Date(snapshot.timestamp) : new Date(),
    fluidityScore: Number(snapshot.fluidityScore || 0),
    kinkDetected: Boolean(snapshot.kinkDetected),
    angles: normalizeAngleSet(snapshot.angles),
    flags: Array.isArray(snapshot.flags) ? Array.from(new Set(snapshot.flags.filter(Boolean))) : []
  };
}

function filterPoseSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return [];
  }

  const sortedSnapshots = snapshots
    .map((snapshot) => normalizeSnapshot(snapshot))
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

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

function calculateSessionSummary(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return {
      averageFluidity: 0,
      totalKinks: 0,
      maxFluidity: 0
    };
  }

  let totalFluidity = 0;
  let totalKinks = 0;
  let maxFluidity = 0;

  for (const snapshot of snapshots) {
    totalFluidity += Number(snapshot.fluidityScore || 0);

    if (snapshot.kinkDetected) {
      totalKinks += 1;
    }

    maxFluidity = Math.max(maxFluidity, Number(snapshot.fluidityScore || 0));
  }

  return {
    averageFluidity: Number((totalFluidity / snapshots.length).toFixed(2)),
    totalKinks,
    maxFluidity: Number(maxFluidity.toFixed(2))
  };
}

sessionSchema.pre("save", function prepareSession(next) {
  this.poseSnapshots = filterPoseSnapshots(this.poseSnapshots || []);
  this.sessionSummary = calculateSessionSummary(this.poseSnapshots || []);

  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
module.exports.SNAPSHOT_INTERVAL_MS = SNAPSHOT_INTERVAL_MS;
module.exports.filterPoseSnapshots = filterPoseSnapshots;
module.exports.calculateSessionSummary = calculateSessionSummary;
module.exports.normalizeSnapshot = normalizeSnapshot;
module.exports.normalizeAngleSet = normalizeAngleSet;
