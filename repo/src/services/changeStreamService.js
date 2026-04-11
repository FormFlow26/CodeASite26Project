const Session = require("../models/Session");

function toWipeoutPayload(session, kinkSnapshots) {
  return {
    userId: session.userId,
    exerciseType: session.exerciseType,
    sessionId: session._id,
    groupId: session.groupId,
    totalKinks: kinkSnapshots.length,
    kinkSnapshots: kinkSnapshots.map((snapshot) => ({
      timestamp: snapshot.timestamp,
      fluidityScore: snapshot.fluidityScore,
      kinkDetected: snapshot.kinkDetected,
      angles: snapshot.angles || {},
      flags: snapshot.flags || []
    }))
  };
}

function emitWipeoutEvent(io, session, kinkSnapshots) {
  if (!io || !session || !Array.isArray(kinkSnapshots) || kinkSnapshots.length === 0) {
    return;
  }

  io.to(`group:${session.groupId}`).emit("WIPEOUT_EVENT", toWipeoutPayload(session, kinkSnapshots));
}

function extractKinkSnapshots(change) {
  if (change.operationType === "insert" || change.operationType === "replace") {
    const snapshots = change.fullDocument?.poseSnapshots || [];
    return snapshots.filter((snapshot) => snapshot.kinkDetected);
  }

  if (change.operationType === "update") {
    const updatedFields = change.updateDescription?.updatedFields || {};
    const kinkSnapshots = [];

    for (const [path, value] of Object.entries(updatedFields)) {
      const match = path.match(/^poseSnapshots\.(\d+)\.kinkDetected$/);
      if (match && value === true) {
        const index = Number(match[1]);
        const snapshot = change.fullDocument?.poseSnapshots?.[index];
        if (snapshot) {
          kinkSnapshots.push(snapshot);
        }
      }
    }

    return kinkSnapshots;
  }

  return [];
}

function initializeSessionChangeStream(io) {
  if (process.env.ENABLE_SESSION_CHANGE_STREAM !== "true") {
    console.log("Session change stream disabled; using direct controller emits for demo flow");
    return null;
  }

  let changeStream;

  try {
    changeStream = Session.watch([], { fullDocument: "updateLookup" });
  } catch (error) {
    console.warn("Session change stream unavailable", error.message);
    return null;
  }

  changeStream.on("change", async (change) => {
    try {
      if (!["insert", "update", "replace"].includes(change.operationType)) {
        return;
      }

      emitWipeoutEvent(io, change.fullDocument, extractKinkSnapshots(change));
    } catch (error) {
      console.error("Failed to process Sessions change stream event", error);
    }
  });

  changeStream.on("error", (error) => {
    console.error("Sessions change stream error", error);
  });

  return changeStream;
}

module.exports = initializeSessionChangeStream;
module.exports.emitWipeoutEvent = emitWipeoutEvent;
module.exports.extractKinkSnapshots = extractKinkSnapshots;
