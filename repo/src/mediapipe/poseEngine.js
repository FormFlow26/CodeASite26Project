const POSE_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";

let poseScriptLoader = null;

function loadScriptOnce(url) {
  if (poseScriptLoader) {
    return poseScriptLoader;
  }

  poseScriptLoader = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      if (window.Pose) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });

  return poseScriptLoader;
}

export function createPoseEngine({
  videoElement,
  exerciseType,
  onFrame,
  onWarning = (warning) => console.warn(warning.message)
}) {
  let pose = null;
  let mediaStream = null;
  let running = false;
  let animationFrameId = null;
  let lastPoseDetectedAt = Date.now();
  let poseLostEmitted = false;

  async function ensurePose() {
    if (pose) {
      return pose;
    }

    await loadScriptOnce(POSE_SCRIPT_URL);

    if (!window.Pose) {
      throw new Error("MediaPipe Pose failed to load");
    }

    pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    pose.onResults((results) => {
      const landmarks = results.poseLandmarks || null;
      const timestamp = Date.now();

      if (Array.isArray(landmarks) && landmarks.length > 0) {
        lastPoseDetectedAt = timestamp;
        poseLostEmitted = false;
        onFrame?.({ landmarks, timestamp, exerciseType });
        return;
      }

      if (!poseLostEmitted && timestamp - lastPoseDetectedAt >= 3000) {
        poseLostEmitted = true;
        onWarning?.({
          type: "pose-lost",
          message: "Pose lost for 3 seconds. Step fully into frame."
        });
      }
    });

    return pose;
  }

  async function processFrame() {
    if (!running) {
      return;
    }

    if (!videoElement || videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animationFrameId = window.requestAnimationFrame(processFrame);
      return;
    }

    try {
      await pose.send({ image: videoElement });
    } catch (error) {
      onWarning?.({
        type: "pose-error",
        message: error.message || "Pose processing failed"
      });
    }

    animationFrameId = window.requestAnimationFrame(processFrame);
  }

  async function start() {
    if (running) {
      return;
    }

    if (!videoElement) {
      throw new Error("createPoseEngine requires a videoElement");
    }

    await ensurePose();
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user"
        }
      });
    } catch (error) {
      throw new Error("Camera access is required to run the FormFlow demo");
    }

    videoElement.srcObject = mediaStream;
    videoElement.playsInline = true;
    videoElement.muted = true;
    await videoElement.play();

    running = true;
    lastPoseDetectedAt = Date.now();
    poseLostEmitted = false;
    animationFrameId = window.requestAnimationFrame(processFrame);
  }

  function stop() {
    running = false;

    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (mediaStream) {
      for (const track of mediaStream.getTracks()) {
        track.stop();
      }
      mediaStream = null;
    }

    if (videoElement) {
      videoElement.pause();
      videoElement.srcObject = null;
    }
  }

  return {
    start,
    stop
  };
}
