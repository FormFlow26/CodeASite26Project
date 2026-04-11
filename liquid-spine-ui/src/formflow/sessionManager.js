const DEFAULT_SERVER_URL = "http://localhost:4000";

function roundToTwo(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function createSessionManager({
  userId,
  groupId,
  exerciseType,
  targetSets,
  repsPerSet,
  socketClient,
  serverUrl = DEFAULT_SERVER_URL
}) {
  let sessionId = null;
  let repCount = 0;
  let setNumber = 1;
  let totalScore = 0;
  let completed = false;
  const sets = [];

  async function request(path, options = {}, errorContext = "session-error") {
    try {
      const response = await fetch(`${serverUrl}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });
      const body = await parseResponse(response);
      return { response, body };
    } catch (error) {
      socketClient?.emit("session-error", {
        context: errorContext,
        message: error.message
      });
      throw error;
    }
  }

  async function startSession() {
    const { response, body } = await request(
      "/api/sessions",
      {
        method: "POST",
        body: JSON.stringify({ userId, groupId, exerciseType })
      },
      "session-init"
    );

    if (!response.ok || !body?._id) {
      throw new Error(body?.error || "Failed to create session");
    }

    sessionId = body._id;
    return body;
  }

  function buildRepPayload(repData) {
    const flags = Array.from(new Set(repData.flags || repData.allFlags || []));
    const fluidityScore = roundToTwo(repData.avgFluidityScore ?? repData.avgFluidity ?? 0);
    const peakAngles = repData.peakAngles || repData.angles || {};
    const points = Math.max(0, Math.round(fluidityScore - flags.length * 5));

    return {
      setNumber,
      repNumber: repCount,
      fluidityScore,
      angles: {
        hipAngle: roundToTwo(peakAngles.hipAngle),
        kneeAngle: roundToTwo(peakAngles.kneeAngle),
        lumbarFlexion: roundToTwo(peakAngles.lumbarFlexion)
      },
      flags,
      points
    };
  }

  async function onSetComplete() {
    if (!sessionId || completed) {
      return null;
    }

    const completedSet = {
      setNumber,
      repsCompleted: repCount
    };

    const { response, body } = await request(
      `/api/sessions/${sessionId}/flush-set`,
      {
        method: "POST",
        body: JSON.stringify({ setNumber })
      },
      "flush-set"
    );

    if (!response.ok) {
      throw new Error(body?.error || `Failed to flush set ${setNumber}`);
    }

    sets.push(completedSet);
    socketClient?.emit("set-complete", {
      sessionId,
      setNumber,
      repsCompleted: repCount
    });

    repCount = 0;
    setNumber += 1;

    if (setNumber > targetSets) {
      return endSession();
    }

    return body;
  }

  async function onRepComplete(repData) {
    if (!sessionId || completed) {
      return null;
    }

    repCount += 1;
    const payload = buildRepPayload(repData);
    const { response, body } = await request(
      `/api/sessions/${sessionId}/rep`,
      {
        method: "PATCH",
        body: JSON.stringify(payload)
      },
      "rep-update"
    );

    if (response.status === 400) {
      console.error("Rep update returned 400", {
        status: response.status,
        body
      });
    }

    if (!response.ok) {
      throw new Error(body?.error || `Failed to persist rep ${payload.repNumber}`);
    }

    totalScore += payload.points;
    socketClient?.emit("rep-complete", {
      sessionId,
      ...payload,
      durationMs: repData.durationMs,
      kinkDetected: Boolean(repData.kinkDetected ?? payload.flags.length > 0)
    });

    if (repCount >= repsPerSet) {
      return onSetComplete();
    }

    return body;
  }

  async function endSession() {
    if (!sessionId || completed) {
      return null;
    }

    const { response, body } = await request(
      `/api/sessions/${sessionId}/complete`,
      {
        method: "POST",
        body: JSON.stringify({ totalScore, sets })
      },
      "session-complete"
    );

    if (!response.ok) {
      throw new Error(body?.error || "Failed to complete session");
    }

    completed = true;
    socketClient?.emit("session-complete", {
      sessionId,
      totalScore,
      sets
    });

    return body;
  }

  const session = await startSession();

  return {
    session,
    getSessionId() {
      return sessionId;
    },
    getCurrentSetNumber() {
      return setNumber;
    },
    getRepCount() {
      return repCount;
    },
    getTotalScore() {
      return totalScore;
    },
    onRepComplete,
    onSetComplete,
    endSession
  };
}
