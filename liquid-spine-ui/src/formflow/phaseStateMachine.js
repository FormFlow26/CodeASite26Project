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
    totalSnapshots: 0,
    flagCounts: {}
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTrimmedAverage(values) {
  const validValues = values
    .filter((value) => Number.isFinite(value))
    .map((value) => clamp(value, 0, 100));

  if (validValues.length === 0) {
    return 0;
  }

  const sortedValues = [...validValues].sort((left, right) => left - right);
  const trimCount = sortedValues.length >= 8 ? Math.floor(sortedValues.length * 0.15) : sortedValues.length >= 5 ? 1 : 0;
  const trimmedValues =
    trimCount > 0 && trimCount * 2 < sortedValues.length
      ? sortedValues.slice(trimCount, sortedValues.length - trimCount)
      : sortedValues;

  const total = trimmedValues.reduce((sum, value) => sum + value, 0);
  return Number((total / trimmedValues.length).toFixed(2));
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

    repStats.totalSnapshots += 1;

    if (Number.isFinite(snapshot.fluidityScore)) {
      repStats.fluiditySamples.push(snapshot.fluidityScore);
    }

    const kinkCount = Array.isArray(snapshot.flags) ? snapshot.flags.length : 0;
    repStats.peakKinkCount = Math.max(repStats.peakKinkCount, kinkCount);

    for (const flag of snapshot.flags || []) {
      repStats.flagCounts[flag] = (repStats.flagCounts[flag] || 0) + 1;
    }
  }

  function getAverageFluidity() {
    return getTrimmedAverage(repStats.fluiditySamples);
  }

  function getStableFlags() {
    const entries = Object.entries(repStats.flagCounts);

    if (entries.length === 0 || repStats.totalSnapshots === 0) {
      return [];
    }

    const minFramesRequired = Math.max(3, Math.ceil(repStats.totalSnapshots * 0.18));

    return entries
      .filter(([, count]) => count >= minFramesRequired)
      .sort((left, right) => right[1] - left[1])
      .map(([flag]) => flag);
  }

  function completeRep(timestamp) {
    const startedAt = repStats.startedAt ?? timestamp;
    const durationMs = timestamp - startedAt;

    if (durationMs < thresholds.minRepDurationMs) {
      resetToIdle();
      return;
    }

    const stableFlags = getStableFlags();
    const repSnapshot = {
      durationMs,
      avgFluidityScore: getAverageFluidity(),
      peakKinkCount: repStats.peakKinkCount,
      totalSnapshots: repStats.totalSnapshots,
      flags: stableFlags,
      kinkDetected: stableFlags.length > 0
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
