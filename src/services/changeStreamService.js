const Session = require("../models/Session");
const buildWipeoutPayload = require("../utils/buildWipeoutPayload");

// Returns the subset of poseSnapshots in the post-change document that
// represent newly-recorded kinks. Handles three Mongo change shapes:
//   - insert: every kink in the new document is "new"
//   - replace: the whole document was replaced; treat all kinks as current
//   - update: walk updatedFields paths to figure out which snapshot
//     indices were touched (covers both `poseSnapshots.N.kinkDetected = true`
//     deep updates and `poseSnapshots.N = {...}` element pushes)
function extractKinkSnapshots(change) {
  const fullSnapshots = change.fullDocument?.poseSnapshots || [];

  if (change.operationType === "insert" || change.operationType === "replace") {
    return fullSnapshots.filter((snapshot) => snapshot && snapshot.kinkDetected);
  }

  if (change.operationType === "update") {
    const updatedFields = change.updateDescription?.updatedFields || {};
    const touchedIndices = new Set();
    let arrayReplaced = false;

    for (const path of Object.keys(updatedFields)) {
      if (path === "poseSnapshots") {
        arrayReplaced = true;
        break;
      }

      const match = path.match(/^poseSnapshots\.(\d+)/);
      if (match) {
        touchedIndices.add(Number(match[1]));
      }
    }

    if (arrayReplaced) {
      return fullSnapshots.filter((snapshot) => snapshot && snapshot.kinkDetected);
    }

    return Array.from(touchedIndices)
      .map((index) => fullSnapshots[index])
      .filter((snapshot) => snapshot && snapshot.kinkDetected);
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
