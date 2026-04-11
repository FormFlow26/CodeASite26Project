export const PHASE_THRESHOLDS = {
  squat: {
    primaryJoint: "hipAngle",
    descentTrigger: 130,
    bottomTrigger: 100,
    ascentTrigger: 110,
    topTrigger: 155,
    minRepDurationMs: 800
  },
  deadlift: {
    primaryJoint: "hipAngle",
    descentTrigger: 140,
    bottomTrigger: 80,
    ascentTrigger: 95,
    topTrigger: 160,
    minRepDurationMs: 1000
  },
  bench: {
    primaryJoint: "kneeAngle",
    descentTrigger: 120,
    bottomTrigger: 90,
    ascentTrigger: 100,
    topTrigger: 145,
    minRepDurationMs: 700
  },
  ohp: {
    primaryJoint: "kneeAngle",
    descentTrigger: 110,
    bottomTrigger: 80,
    ascentTrigger: 90,
    topTrigger: 155,
    minRepDurationMs: 800
  }
};

function createEmptyRepStats() {
  return {
    startedAt: null,
    fluiditySamples: [],
    peakKinkCount: 0,
    flags: new Set()
  };
}

export function createPhaseStateMachine(exerciseType, onRepComplete) {
  const thresholds = PHASE_THRESHOLDS[exerciseType] || PHASE_THRESHOLDS.squat;
  let phase = "IDLE";
  let repStats = createEmptyRepStats();

  function resetToIdle() {
    phase = "IDLE";
    repStats = createEmptyRepStats();
  }

  function captureSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }

    if (repStats.startedAt === null) {
      repStats.startedAt = snapshot.timestamp;
    }

    if (Number.isFinite(snapshot.fluidityScore)) {
      repStats.fluiditySamples.push(snapshot.fluidityScore);
    }

    const kinkCount = Array.isArray(snapshot.flags) ? snapshot.flags.length : 0;
    repStats.peakKinkCount = Math.max(repStats.peakKinkCount, kinkCount);

    for (const flag of snapshot.flags || []) {
      repStats.flags.add(flag);
    }
  }

  function getAverageFluidity() {
    if (repStats.fluiditySamples.length === 0) {
      return 0;
    }

    const total = repStats.fluiditySamples.reduce((sum, value) => sum + value, 0);
    return Number((total / repStats.fluiditySamples.length).toFixed(2));
  }

  function completeRep(timestamp) {
    const startedAt = repStats.startedAt ?? timestamp;
    const durationMs = timestamp - startedAt;

    if (durationMs < thresholds.minRepDurationMs) {
      resetToIdle();
      return;
    }

    const repSnapshot = {
      durationMs,
      avgFluidityScore: getAverageFluidity(),
      peakKinkCount: repStats.peakKinkCount,
      flags: Array.from(repStats.flags)
    };

    onRepComplete?.(repSnapshot);
    resetToIdle();
  }

  function update(angles, timestamp, snapshot) {
    const primaryValue = angles?.[thresholds.primaryJoint];
    if (!Number.isFinite(primaryValue)) {
      return phase;
    }

    const shouldTrackSnapshot =
      phase === "DESCENDING" ||
      phase === "BOTTOM" ||
      phase === "ASCENDING" ||
      ((phase === "IDLE" || phase === "TOP") && primaryValue < thresholds.descentTrigger);

    if (shouldTrackSnapshot) {
      captureSnapshot(snapshot);
    }

    switch (phase) {
      case "IDLE":
      case "TOP":
        if (primaryValue < thresholds.descentTrigger) {
          phase = "DESCENDING";
          if (repStats.startedAt === null) {
            repStats.startedAt = timestamp;
          }
        }
        break;
      case "DESCENDING":
        if (primaryValue < thresholds.bottomTrigger) {
          phase = "BOTTOM";
        } else if (primaryValue >= thresholds.topTrigger) {
          resetToIdle();
        }
        break;
      case "BOTTOM":
        if (primaryValue > thresholds.ascentTrigger) {
          phase = "ASCENDING";
        }
        break;
      case "ASCENDING":
        if (primaryValue >= thresholds.topTrigger) {
          phase = "TOP";
          completeRep(timestamp);
        } else if (primaryValue < thresholds.bottomTrigger) {
          phase = "BOTTOM";
        }
        break;
      default:
        resetToIdle();
        break;
    }

    return phase;
  }

  return {
    update,
    getPhase() {
      return phase;
    },
    reset() {
      resetToIdle();
    }
  };
}
