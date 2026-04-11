const Session = require("../models/Session");
const buildWipeoutPayload = require("../utils/buildWipeoutPayload");

function extractKinkSnapshots(change) {
  if (change.operationType === "replace") {
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

async function emitWipeoutForSession(change, io) {
  const session = change.fullDocument;
  if (!session) {
    return;
  }

  const kinkSnapshots = extractKinkSnapshots(change);
  if (kinkSnapshots.length === 0) {
    return;
  }

  const payload = buildWipeoutPayload(session, kinkSnapshots);

  if (session.groupId) {
    io.to(`group:${session.groupId}`).emit("WIPEOUT_EVENT", payload);
  }

  io.emit("WIPEOUT_EVENT", payload);
}

function initializeSessionChangeStream(io) {
  const changeStream = Session.watch([], { fullDocument: "updateLookup" });

  changeStream.on("change", async (change) => {
    try {
      if (!["insert", "update", "replace"].includes(change.operationType)) {
        return;
      }

      if (change.operationType === "insert") {
        return;
      }

      await emitWipeoutForSession(change, io);
    } catch (error) {
      console.error("Failed to process Sessions change stream event", error);
    }
  });

  changeStream.on("error", (error) => {
    console.error("Sessions change stream error", error);
  });
}

module.exports = initializeSessionChangeStream;
