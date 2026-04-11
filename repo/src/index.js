import { createPoseEngine } from "./mediapipe/poseEngine.js";
import { createSessionManager } from "./mediapipe/sessionManager.js";
import { createSocketClient } from "./socket/socketClient.js";
import { getLandmarkAngles } from "./mediapipe/angleUtils.js";
import { initFluidityScorer, computeFluidityScore } from "./mediapipe/fluidityScorer.js";
import { detectKinks } from "./mediapipe/kinkDetector.js";
import { createPhaseStateMachine } from "./mediapipe/phaseStateMachine.js";
import { createSnapshotBuffer } from "./mediapipe/snapshotBuffer.js";

const DEFAULT_SERVER_URL =
  typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost:4000";

const CONFIG = {
  userId: "",
  groupId: "",
  exerciseType: "squat",
  targetSets: 4,
  repsPerSet: 8,
  serverUrl: DEFAULT_SERVER_URL
};

function emitStatus(type, message, detail = {}) {
  if (typeof window !== "undefined" && typeof window.onFormFlowStatus === "function") {
    window.onFormFlowStatus({ type, message, ...detail });
  }
}

function ensureVideoElement() {
  const existingVideo =
    document.querySelector("#formflow-video") || document.querySelector("[data-formflow-camera]");

  if (existingVideo instanceof HTMLVideoElement) {
    return existingVideo;
  }

  const videoElement = document.createElement("video");
  videoElement.id = "formflow-video";
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.muted = true;
  document.body.appendChild(videoElement);
  return videoElement;
}

export async function startFormFlow(runtimeConfig = {}) {
  const config = { ...CONFIG, ...runtimeConfig };

  if (!config.userId || !config.groupId) {
    throw new Error("startFormFlow requires userId and groupId");
  }

  const videoElement = ensureVideoElement();

  emitStatus("loading", "Opening realtime connection");
  const socketClient = await createSocketClient({
    serverUrl: config.serverUrl,
    groupId: config.groupId,
    userId: config.userId
  });

  emitStatus("loading", "Creating workout session");
  const sessionManager = await createSessionManager({
    userId: config.userId,
    groupId: config.groupId,
    exerciseType: config.exerciseType,
    targetSets: config.targetSets,
    repsPerSet: config.repsPerSet,
    serverUrl: config.serverUrl,
    socketClient
  });

  const snapshotBuffer = createSnapshotBuffer();
  const fluidityScorer = initFluidityScorer();
  let previousAngles = null;
  let previousTimestamp = null;

  const phaseStateMachine = createPhaseStateMachine(config.exerciseType, async (repMeta) => {
    const repSummary = snapshotBuffer.getRepSummary();
    const snapshots = snapshotBuffer.flush();

    if (snapshots.length === 0) {
      return;
    }

    try {
      const response = await sessionManager.onRepComplete({
        ...repMeta,
        ...repSummary,
        snapshots,
        kinkDetected: repSummary.kinkDetected
      });

      emitStatus("rep-complete", "Rep recorded", {
        progress: sessionManager.getProgress(),
        serverProgress: response?.progress || null
      });
    } catch (error) {
      console.error("Failed to complete rep", error);
      emitStatus("error", error.message, {
        context: "rep-complete"
      });
      socketClient.emit("session-error", {
        context: "rep-complete",
        message: error.message
      });
    }
  });

  const poseEngine = createPoseEngine({
    videoElement,
    exerciseType: config.exerciseType,
    onWarning: (warning) => {
      emitStatus("warning", warning.message, warning);
      socketClient.emit("pose-warning", warning);
    },
    onFrame: ({ landmarks, timestamp }) => {
      const angles = getLandmarkAngles(landmarks, config.exerciseType);
      const deltaMs = previousTimestamp === null ? 0 : timestamp - previousTimestamp;
      const fluidityScore = computeFluidityScore(fluidityScorer, angles, previousAngles, deltaMs);
      const { kinkDetected, flags } = detectKinks(landmarks, angles, config.exerciseType);

      const snapshot = {
        timestamp,
        fluidityScore,
        kinkDetected: flags.length > 0 || kinkDetected,
        angles,
        flags
      };

      snapshotBuffer.push(snapshot);
      phaseStateMachine.update(angles, timestamp, snapshot);

      previousAngles = angles;
      previousTimestamp = timestamp;
    }
  });

  try {
    emitStatus("loading", "Starting camera and pose engine");
    await poseEngine.start();
  } catch (error) {
    emitStatus("error", error.message, {
      context: "pose-start"
    });
    socketClient.disconnect();
    throw error;
  }

  emitStatus("ready", "Pose tracking active", {
    progress: sessionManager.getProgress()
  });

  return {
    config,
    videoElement,
    socketClient,
    sessionManager,
    phaseStateMachine,
    snapshotBuffer,
    poseEngine,
    stop() {
      poseEngine.stop();
      socketClient.disconnect();
      emitStatus("stopped", "Session stopped");
    }
  };
}

if (typeof window !== "undefined") {
  window.startFormFlow = startFormFlow;
}
