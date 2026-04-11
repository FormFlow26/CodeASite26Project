const EMA_ALPHA = 0.3;
const SENSITIVITY = 2.5;
const JOINT_WEIGHTS = {
  hipAngle: 0.4,
  kneeAngle: 0.4,
  lumbarFlexion: 0.2
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function smoothVelocity(previousValue, currentValue) {
  return previousValue + EMA_ALPHA * (currentValue - previousValue);
}

export function initFluidityScorer() {
  return {
    emaVelocity: {
      hipAngle: 0,
      kneeAngle: 0,
      lumbarFlexion: 0
    },
    lastScore: 100
  };
}

export function computeFluidityScore(scorer, currentAngles, prevAngles, deltaMs) {
  if (!scorer || !currentAngles || !prevAngles || !Number.isFinite(deltaMs) || deltaMs <= 0) {
    return scorer?.lastScore ?? 100;
  }

  const instantaneousVelocity = {
    hipAngle: Math.abs(currentAngles.hipAngle - prevAngles.hipAngle) / deltaMs,
    kneeAngle: Math.abs(currentAngles.kneeAngle - prevAngles.kneeAngle) / deltaMs,
    lumbarFlexion: Math.abs(currentAngles.lumbarFlexion - prevAngles.lumbarFlexion) / deltaMs
  };

  for (const jointName of Object.keys(JOINT_WEIGHTS)) {
    scorer.emaVelocity[jointName] = smoothVelocity(
      scorer.emaVelocity[jointName],
      instantaneousVelocity[jointName]
    );
  }

  const weightedVelocity =
    scorer.emaVelocity.hipAngle * JOINT_WEIGHTS.hipAngle +
    scorer.emaVelocity.kneeAngle * JOINT_WEIGHTS.kneeAngle +
    scorer.emaVelocity.lumbarFlexion * JOINT_WEIGHTS.lumbarFlexion;

  const score = clamp(100 - weightedVelocity * SENSITIVITY * 1000, 0, 100);
  scorer.lastScore = Number(score.toFixed(2));
  return scorer.lastScore;
}
