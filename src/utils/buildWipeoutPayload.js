function serializeSnapshots(snapshots = []) {
  return snapshots.map((snapshot) => ({
    timestamp: snapshot.timestamp,
    fluidityScore: snapshot.fluidityScore,
    kinkDetected: snapshot.kinkDetected,
  }));
}

function buildWipeoutPayload(session, kinkSnapshots = null) {
  const allSnapshots = Array.isArray(session?.poseSnapshots) ? session.poseSnapshots : [];
  const detectedSnapshots = Array.isArray(kinkSnapshots)
    ? kinkSnapshots
    : allSnapshots.filter((snapshot) => snapshot.kinkDetected);

  return {
    sessionId: session?._id,
    userId: session?.userId,
    groupId: session?.groupId,
    exerciseType: session?.exerciseType,
    totalKinks: session?.sessionSummary?.totalKinks ?? detectedSnapshots.length,
    averageFluidity: session?.sessionSummary?.averageFluidity ?? 0,
    maxFluidity: session?.sessionSummary?.maxFluidity ?? 0,
    kinkSnapshots: serializeSnapshots(detectedSnapshots),
  };
}

module.exports = buildWipeoutPayload;
