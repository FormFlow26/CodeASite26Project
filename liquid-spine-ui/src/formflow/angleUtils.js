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

const VERTICAL_AXIS = { x: 0, y: -1, z: 0 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function subtractPoints(left, right) {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: (left.z || 0) - (right.z || 0)
  };
}

function vectorMagnitude(vector) {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

function dotProduct(left, right) {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function midpoint(left, right) {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    z: ((left.z || 0) + (right.z || 0)) / 2
  };
}

function getLandmark(landmarks, index) {
  const landmark = landmarks?.[index];
  if (!landmark) {
    throw new Error(`Missing landmark at index ${index}`);
  }

  return landmark;
}

function getVisibility(landmark) {
  return Number.isFinite(landmark?.visibility) ? landmark.visibility : 0;
}

function getDominantLowerBodySide(leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle) {
  const leftVisibility = average([
    getVisibility(leftShoulder),
    getVisibility(leftHip),
    getVisibility(leftKnee),
    getVisibility(leftAnkle)
  ]);
  const rightVisibility = average([
    getVisibility(rightShoulder),
    getVisibility(rightHip),
    getVisibility(rightKnee),
    getVisibility(rightAnkle)
  ]);

  return leftVisibility >= rightVisibility
    ? {
      shoulder: leftShoulder,
      hip: leftHip,
      knee: leftKnee,
      ankle: leftAnkle
    }
    : {
      shoulder: rightShoulder,
      hip: rightHip,
      knee: rightKnee,
      ankle: rightAnkle
    };
}

export function computeAngle(a, b, c) {
  const vectorBA = subtractPoints(a, b);
  const vectorBC = subtractPoints(c, b);
  const magnitudeBA = vectorMagnitude(vectorBA);
  const magnitudeBC = vectorMagnitude(vectorBC);

  if (magnitudeBA === 0 || magnitudeBC === 0) {
    return 0;
  }

  const cosine = clamp(dotProduct(vectorBA, vectorBC) / (magnitudeBA * magnitudeBC), -1, 1);
  return (Math.acos(cosine) * 180) / Math.PI;
}

function computeTorsoFlexion(shoulder, hip) {
  const torsoVector = subtractPoints(shoulder, hip);
  const torsoMagnitude = vectorMagnitude(torsoVector);

  if (torsoMagnitude === 0) {
    return 0;
  }

  const cosine = clamp(
    dotProduct(torsoVector, VERTICAL_AXIS) / (torsoMagnitude * vectorMagnitude(VERTICAL_AXIS)),
    -1,
    1
  );

  return (Math.acos(cosine) * 180) / Math.PI;
}

function computeLumbarFlexion(leftShoulder, rightShoulder, leftHip, rightHip) {
  const shoulderMidpoint = midpoint(leftShoulder, rightShoulder);
  const hipMidpoint = midpoint(leftHip, rightHip);
  return computeTorsoFlexion(shoulderMidpoint, hipMidpoint);
}

function computeLowerBodyAngles(landmarks) {
  const leftShoulder = getLandmark(landmarks, LANDMARK_INDEX.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_SHOULDER);
  const leftHip = getLandmark(landmarks, LANDMARK_INDEX.LEFT_HIP);
  const rightHip = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_HIP);
  const leftKnee = getLandmark(landmarks, LANDMARK_INDEX.LEFT_KNEE);
  const rightKnee = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_KNEE);
  const leftAnkle = getLandmark(landmarks, LANDMARK_INDEX.LEFT_ANKLE);
  const rightAnkle = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_ANKLE);
  const dominantSide = getDominantLowerBodySide(
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle
  );

  return {
    hipAngle: computeAngle(dominantSide.shoulder, dominantSide.hip, dominantSide.knee),
    kneeAngle: computeAngle(dominantSide.hip, dominantSide.knee, dominantSide.ankle),
    lumbarFlexion: computeTorsoFlexion(dominantSide.shoulder, dominantSide.hip)
  };
}

function computeUpperBodyAngles(landmarks) {
  const leftShoulder = getLandmark(landmarks, LANDMARK_INDEX.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_SHOULDER);
  const leftElbow = getLandmark(landmarks, LANDMARK_INDEX.LEFT_ELBOW);
  const rightElbow = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_ELBOW);
  const leftWrist = getLandmark(landmarks, LANDMARK_INDEX.LEFT_WRIST);
  const rightWrist = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_WRIST);
  const leftHip = getLandmark(landmarks, LANDMARK_INDEX.LEFT_HIP);
  const rightHip = getLandmark(landmarks, LANDMARK_INDEX.RIGHT_HIP);

  const elbowAngle = average([
    computeAngle(leftShoulder, leftElbow, leftWrist),
    computeAngle(rightShoulder, rightElbow, rightWrist)
  ]);
  const shoulderPressAngle = average([
    computeAngle(leftHip, leftShoulder, leftElbow),
    computeAngle(rightHip, rightShoulder, rightElbow)
  ]);

  return {
    hipAngle: shoulderPressAngle,
    kneeAngle: elbowAngle,
    lumbarFlexion: computeLumbarFlexion(leftShoulder, rightShoulder, leftHip, rightHip)
  };
}

export function getLandmarkAngles(landmarks, exerciseType) {
  if (!Array.isArray(landmarks) || landmarks.length === 0) {
    return {
      hipAngle: 0,
      kneeAngle: 0,
      lumbarFlexion: 0
    };
  }

  if (exerciseType === "bench" || exerciseType === "ohp") {
    return computeUpperBodyAngles(landmarks);
  }

  return computeLowerBodyAngles(landmarks);
}
