import { startFormFlow } from "/src/index.js";

const ui = {
  bootstrapButton: document.querySelector("#bootstrap-button"),
  startButton: document.querySelector("#start-button"),
  stopButton: document.querySelector("#stop-button"),
  userId: document.querySelector("#user-id"),
  groupId: document.querySelector("#group-id"),
  exerciseType: document.querySelector("#exercise-type"),
  targetSets: document.querySelector("#target-sets"),
  repsPerSet: document.querySelector("#reps-per-set"),
  serverUrl: document.querySelector("#server-url"),
  sessionId: document.querySelector("#session-id"),
  currentSet: document.querySelector("#current-set"),
  currentReps: document.querySelector("#current-reps"),
  totalScore: document.querySelector("#total-score"),
  averageFluidity: document.querySelector("#average-fluidity"),
  totalKinks: document.querySelector("#total-kinks"),
  statusText: document.querySelector("#status-text"),
  connectionStatus: document.querySelector("#connection-status"),
  phaseBadge: document.querySelector("#phase-badge"),
  eventLog: document.querySelector("#event-log")
};

let runtime = null;

function appendLog(message, payload = null) {
  const lines = [`[${new Date().toLocaleTimeString()}] ${message}`];
  if (payload) {
    lines.push(JSON.stringify(payload, null, 2));
  }

  const previous = ui.eventLog.textContent.trim();
  ui.eventLog.textContent = `${lines.join("\n")}\n\n${previous}`.trim();
}

function updateProgress(progress = {}) {
  ui.sessionId.textContent = progress.sessionId || ui.sessionId.textContent;
  ui.currentSet.textContent = String(progress.setNumber || progress.currentSetNumber || 0);
  ui.currentReps.textContent = String(progress.repCount || progress.totalReps || 0);
  ui.totalScore.textContent = String(progress.totalScore ?? 0);
  ui.averageFluidity.textContent = String(progress.sessionSummary?.averageFluidity ?? 0);
  ui.totalKinks.textContent = String(progress.sessionSummary?.totalKinks ?? 0);
}

async function bootstrapDemoContext() {
  ui.statusText.textContent = "Preparing demo context";
  ui.connectionStatus.textContent = "Loading";
  const response = await fetch("/api/demo/bootstrap");
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || "Failed to prepare demo context");
  }

  ui.userId.value = body.userId;
  ui.groupId.value = body.groupId;
  ui.exerciseType.value = body.exerciseType;
  ui.targetSets.value = String(body.targetSets);
  ui.repsPerSet.value = String(body.repsPerSet);
  ui.serverUrl.value = window.location.origin;

  ui.connectionStatus.textContent = "Ready";
  ui.statusText.textContent = "Demo context ready";
  appendLog("Demo context ready", body);
}

window.onFormFlowStatus = (event) => {
  ui.statusText.textContent = event.message;
  ui.connectionStatus.textContent = event.type;

  if (event.progress) {
    updateProgress(event.progress);
  }

  appendLog(event.message, event);
};

window.onWipeoutEvent = (event) => {
  ui.connectionStatus.textContent = "Wipeout";
  ui.totalKinks.textContent = String(event.totalKinks || event.kinkSnapshots?.length || 0);
  appendLog("Wipeout event received", event);
};

async function startDemo() {
  if (runtime) {
    return;
  }

  ui.startButton.disabled = true;
  ui.bootstrapButton.disabled = true;

  try {
    runtime = await startFormFlow({
      userId: ui.userId.value,
      groupId: ui.groupId.value,
      exerciseType: ui.exerciseType.value,
      targetSets: Number(ui.targetSets.value),
      repsPerSet: Number(ui.repsPerSet.value),
      serverUrl: ui.serverUrl.value
    });

    ui.sessionId.textContent = runtime.sessionManager.getSessionId() || "Pending";
    updateProgress(runtime.sessionManager.getProgress());
    ui.stopButton.disabled = false;
    ui.phaseBadge.textContent = runtime.phaseStateMachine.getPhase();

    const originalUpdate = runtime.phaseStateMachine.update.bind(runtime.phaseStateMachine);
    runtime.phaseStateMachine.update = (...args) => {
      const phase = originalUpdate(...args);
      ui.phaseBadge.textContent = phase;
      return phase;
    };

    appendLog("Session started", runtime.config);
  } catch (error) {
    appendLog("Failed to start session", { error: error.message });
    ui.startButton.disabled = false;
    ui.bootstrapButton.disabled = false;
  }
}

function stopDemo() {
  if (!runtime) {
    return;
  }

  runtime.stop();
  runtime = null;
  ui.startButton.disabled = false;
  ui.bootstrapButton.disabled = false;
  ui.stopButton.disabled = true;
  ui.phaseBadge.textContent = "Idle";
  appendLog("Session stopped");
}

ui.bootstrapButton.addEventListener("click", async () => {
  ui.bootstrapButton.disabled = true;
  try {
    await bootstrapDemoContext();
  } finally {
    ui.bootstrapButton.disabled = false;
  }
});

ui.startButton.addEventListener("click", startDemo);
ui.stopButton.addEventListener("click", stopDemo);

bootstrapDemoContext().catch((error) => {
  appendLog("Bootstrap failed", { error: error.message });
  ui.statusText.textContent = error.message;
  ui.connectionStatus.textContent = "Error";
});
