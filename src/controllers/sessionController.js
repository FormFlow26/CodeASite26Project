const Session = require("../models/Session");
const { awardSessionCompletionCredits } = require("./userController");

async function createSession(req, res) {
  try {
    const session = await Session.create(req.body);
    const updatedUser = await awardSessionCompletionCredits(session.userId);
    const io = req.app.get("io");

    if (session.sessionSummary.totalKinks > 0 && io) {
      io.to(`group:${session.groupId}`).emit("WIPEOUT_EVENT", {
        sessionId: session._id,
        userId: session.userId,
        groupId: session.groupId,
        exerciseType: session.exerciseType,
        totalKinks: session.sessionSummary.totalKinks,
        averageFluidity: session.sessionSummary.averageFluidity,
        maxFluidity: session.sessionSummary.maxFluidity,
        poseSnapshots: session.poseSnapshots.filter((snapshot) => snapshot.kinkDetected)
      });
    }

    return res.status(201).json({
      session,
      user: updatedUser
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createSession
};
