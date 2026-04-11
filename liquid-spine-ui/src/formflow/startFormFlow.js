import { createPoseEngine } from "./poseEngine.js";
import { createSessionManager } from "./sessionManager.js";
import { createSocketClient } from "./socketClient.js";
import { getLandmarkAngles } from "./angleUtils.js";
import { initFluidityScorer, computeFluidityScore } from "./fluidityScorer.js";
import { detectKinks } from "./kinkDetector.js";
import { createPhaseStateMachine } from "./phaseStateMachine.js";
import { createSnapshotBuffer } from "./snapshotBuffer.js";

const CONFIG = {
  userId: "",
  groupId: "",
  exerciseType: "squat",
  targetSets: 4,
  repsPerSet: 8,
  serverUrl:
    (typeof window !== "undefined" && window.__FORMFLOW_SERVER_URL__) ||
    "http://localhost:4000"
};

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
  videoElement.style.position = "fixed";
  videoElement.style.right = "16px";
  videoElement.style.bottom = "16px";
  videoElement.style.width = "240px";
  videoElement.style.height = "180px";
  videoElement.style.background = "#000";
  document.body.appendChild(videoElement);
  return videoElement;
}

export async function startFormFlow(runtimeConfig = {}) {
  const config = { ...CONFIG, ...runtimeConfig };
  // Use the videoElement passed by the caller (e.g. GymTab's videoRef) or fall back to DOM lookup
  const videoElement = runtimeConfig.videoElement || ensureVideoElement();

  const socketClient = await createSocketClient({
    serverUrl: config.serverUrl,
    groupId: config.groupId,
    userId: config.userId
  });

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
      await sessionManager.onRepComplete({
        ...repMeta,
        ...repSummary,
        snapshots,
        kinkDetected: repSummary.kinkDetected
      });

      // Notify the caller (e.g. GymTab) that a rep completed
      if (typeof config.onRepComplete === "function") {
        config.onRepComplete({
          kinkDetected: repSummary.kinkDetected,
          fluidityScore: repSummary.avgFluidity,
          flags: repSummary.allFlags,
          ...repMeta
        });
      }
    } catch (error) {
      console.error("Failed to complete rep", error);
      socketClient.emit("session-error", {
        context: "rep-complete",
        message: error.message
      });
    }
  });

  const poseEngine = createPoseEngine({
    videoElement,
    exerciseType: config.exerciseType,
    onWarning: (warning) => socketClient.emit("pose-warning", warning),
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

  await poseEngine.start();

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
    }
  };
}

if (typeof window !== "undefined") {
  window.startFormFlow = startFormFlow;
}
