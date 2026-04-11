const LANDMARK_INDEX = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28
};

export const KINK_THRESHOLDS = {
  squat: {
    knee_valgus: 0.18,
    lumbar_flex: 68
  },
  deadlift: {
    lumbar_flex: 35,
    hip_rise: 15
  },
  bench: {
    elbow_flare: 75,
    wrist_misalign: 0.04
  },
  ohp: {
    lumbar_flex: 25,
    elbow_forward: 60
  }
};

function getLandmark(landmarks, index) {
  return landmarks?.[index] || null;
}

function getSpan(left, right, axis = "x") {
  if (!left || !right) {
    return 0;
  }

  return Math.abs(left[axis] - right[axis]);
}

function distance2D(left, right) {
  if (!left || !right) {
    return 0;
  }

  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx ** 2 + dy ** 2);
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value) && value > 0);
  if (validValues.length === 0) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function isFrontFacingLowerBody(leftShoulder, rightShoulder, leftHip, rightHip) {
  const torsoLength = average([
    distance2D(leftShoulder, leftHip),
    distance2D(rightShoulder, rightHip)
  ]) || 1;
  const shoulderSpan = getSpan(leftShoulder, rightShoulder);
  const hipSpan = getSpan(leftHip, rightHip);
  const widthRatio = Math.max(shoulderSpan, hipSpan) / torsoLength;

  return widthRatio >= 0.55;
}

function addFlag(flags, flag) {
  if (!flags.includes(flag)) {
    flags.push(flag);
  }
}

function detectSquatKinks(landmarks, angles, flags) {
  const thresholds = KINK_THRESHOLDS.squat;
  const leftShoulder = getLandmark(landmarks, LANDMARK_INDEX.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_SHOULDER);
  const leftKnee = getLandmark(landmarks, LANDMARK_INDEX.LEFT_KNEE);
  const rightKnee = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_KNEE);
  const leftAnkle = getLandmark(landmarks, LANDMARK_INDEX.LEFT_ANKLE);
  const rightAnkle = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_ANKLE);
  const leftHip = getLandmark(landmarks, LANDMARK_INDEX.LEFT_HIP);
  const rightHip = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_HIP);

  const kneeSpan = getSpan(leftKnee, rightKnee);
  const ankleSpan = getSpan(leftAnkle, rightAnkle);
  const hipSpan = getSpan(leftHip, rightHip) || 1;
  const inwardCollapse = Math.max(0, ankleSpan - kneeSpan) / hipSpan;
  const frontFacing = isFrontFacingLowerBody(leftShoulder, rightShoulder, leftHip, rightHip);
  const evaluatingDepth = angles.hipAngle < 145 || angles.kneeAngle < 145;

  if (
    frontFacing &&
    evaluatingDepth &&
    ankleSpan > 0.03 &&
    kneeSpan < hipSpan * 0.9 &&
    inwardCollapse > thresholds.knee_valgus
  ) {
    addFlag(flags, "knee_valgus");
  }

  if (evaluatingDepth && angles.lumbarFlexion > thresholds.lumbar_flex) {
    addFlag(flags, "lumbar_flex");
  }
}

function detectDeadliftKinks(landmarks, angles, flags) {
  const thresholds = KINK_THRESHOLDS.deadlift;
  const leftShoulder = getLandmark(landmarks, LANDMARK_INDEX.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_SHOULDER);
  const leftHip = getLandmark(landmarks, LANDMARK_INDEX.LEFT_HIP);
  const rightHip = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_HIP);

  if (angles.lumbarFlexion > thresholds.lumbar_flex) {
    addFlag(flags, "lumbar_flex");
  }

  if (leftShoulder && rightShoulder && leftHip && rightHip) {
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const torsoCompression = Math.abs(hipY - shoulderY) * 100;

    if (angles.hipAngle < 120 && torsoCompression < thresholds.hip_rise) {
      addFlag(flags, "hip_rise");
    }
  }
}

function detectBenchKinks(landmarks, angles, flags) {
  const thresholds = KINK_THRESHOLDS.bench;
  const leftWrist = getLandmark(landmarks, LANDMARK_INDEX.LEFT_WRIST);
  const rightWrist = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_WRIST);
  const leftElbow = getLandmark(landmarks, LANDMARK_INDEX.LEFT_ELBOW);
  const rightElbow = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_ELBOW);

  if (angles.kneeAngle > thresholds.elbow_flare) {
    addFlag(flags, "elbow_flare");
  }

  if (leftWrist && rightWrist && leftElbow && rightElbow) {
    const leftOffset = Math.abs(leftWrist.x - leftElbow.x);
    const rightOffset = Math.abs(rightWrist.x - rightElbow.x);
    if (Math.max(leftOffset, rightOffset) > thresholds.wrist_misalign) {
      addFlag(flags, "wrist_misalign");
    }
  }
}

function detectOhpKinks(landmarks, angles, flags) {
  const thresholds = KINK_THRESHOLDS.ohp;
  const leftShoulder = getLandmark(landmarks, LANDMARK_INDEX.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_SHOULDER);
  const leftElbow = getLandmark(landmarks, LANDMARK_INDEX.LEFT_ELBOW);
  const rightElbow = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_ELBOW);

  if (angles.lumbarFlexion > thresholds.lumbar_flex) {
    addFlag(flags, "lumbar_flex");
  }

  if (leftShoulder && rightShoulder && leftElbow && rightElbow) {
    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const elbowCenterX = (leftElbow.x + rightElbow.x) / 2;
    const forwardProxy = Math.abs(elbowCenterX - shoulderCenterX) * 180;

    if (forwardProxy > thresholds.elbow_forward) {
      addFlag(flags, "elbow_forward");
    }
  }
}

export function detectKinks(landmarks, angles, exerciseType) {
  const flags = [];

  if (!Array.isArray(landmarks) || !angles) {
    return {
      kinkDetected: false,
      flags
    };
  }

  switch (exerciseType) {
    case "squat":
      detectSquatKinks(landmarks, angles, flags);
      break;
    case "deadlift":
      detectDeadliftKinks(landmarks, angles, flags);
      break;
    case "bench":
      detectBenchKinks(landmarks, angles, flags);
      break;
    case "ohp":
      detectOhpKinks(landmarks, angles, flags);
      break;
    default:
      break;
  }

  return {
    kinkDetected: flags.length > 0,
    flags
  };
}
