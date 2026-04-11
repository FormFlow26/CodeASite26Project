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

function createOfflineSocketClient({ userId, groupId }) {
  return {
    socket: null,
    userId,
    groupId,
    emit() {},
    on() {},
    disconnect() {}
  };
}

export async function startFormFlow(runtimeConfig = {}) {
  const config = { ...CONFIG, ...runtimeConfig };
  // Use the videoElement passed by the caller (e.g. GymTab's videoRef) or fall back to DOM lookup
  const videoElement = runtimeConfig.videoElement || ensureVideoElement();
  let socketClient = createOfflineSocketClient({
    userId: config.userId,
    groupId: config.groupId
  });
  let sessionManager = null;
  let sessionInitErrorMessage = "";

  function reportSystemError(context, error) {
    console.error(`FormFlow ${context} error`, error);

    if (typeof config.onSystemError === "function") {
      config.onSystemError({
        context,
        message: error?.message || "Unexpected FormFlow error"
      });
    }
  }

  const sessionManagerReady = (async () => {
    try {
      socketClient = await createSocketClient({
        serverUrl: config.serverUrl,
        groupId: config.groupId,
        userId: config.userId
      });

      sessionManager = await createSessionManager({
        userId: config.userId,
        groupId: config.groupId,
        exerciseType: config.exerciseType,
        targetSets: config.targetSets,
        repsPerSet: config.repsPerSet,
        serverUrl: config.serverUrl,
        socketClient
      });

      return sessionManager;
    } catch (error) {
      sessionInitErrorMessage = error?.message || "Live sync is unavailable right now.";
      reportSystemError("session-init", error);
      return null;
    }
  })();

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
      const activeSessionManager = sessionManager || (await sessionManagerReady);

      if (!activeSessionManager) {
        throw new Error(
          sessionInitErrorMessage || "Live sync is unavailable right now. Camera tracking is still running."
        );
      }

      const resolvedFlags = repMeta.flags ?? repSummary.allFlags;
      const resolvedKinkDetected =
        typeof repMeta.kinkDetected === "boolean"
          ? repMeta.kinkDetected
          : resolvedFlags.length > 0 || repSummary.kinkDetected;
      const resolvedFluidityScore = repMeta.avgFluidityScore ?? repSummary.avgFluidity;

      await activeSessionManager.onRepComplete({
        ...repMeta,
        ...repSummary,
        snapshots,
        kinkDetected: resolvedKinkDetected
      });

      // Notify the caller (e.g. GymTab) that a rep completed
      if (typeof config.onRepComplete === "function") {
        config.onRepComplete({
          ...repMeta,
          kinkDetected: resolvedKinkDetected,
          fluidityScore: resolvedFluidityScore,
          flags: resolvedFlags
        });
      }
    } catch (error) {
      reportSystemError("rep-complete", error);
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

      if (typeof config.onAnalysis === "function") {
        config.onAnalysis({
          timestamp,
          fluidityScore,
          kinkDetected: snapshot.kinkDetected,
          flags,
          angles
        });
      }

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
