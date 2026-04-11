function serializeSnapshots(snapshots = []) {
  return snapshots.map((snapshot) => ({
    timestamp: snapshot.timestamp,
    fluidityScore: snapshot.fluidityScore,
    kinkDetected: snapshot.kinkDetected,
  }));
}

function summarizeSnapshots(snapshots = []) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return {
      totalKinks: 0,
      averageFluidity: 0,
      maxFluidity: 0,
    };
  }

  let totalFluidity = 0;
  let totalKinks = 0;
  let maxFluidity = 0;

  for (const snapshot of snapshots) {
    const fluidityScore = Number(snapshot?.fluidityScore) || 0;
    totalFluidity += fluidityScore;
    maxFluidity = Math.max(maxFluidity, fluidityScore);

    if (snapshot?.kinkDetected) {
      totalKinks += 1;
    }
  }

  return {
    totalKinks,
    averageFluidity: totalFluidity / snapshots.length,
    maxFluidity,
  };
}

function buildWipeoutPayload(session, kinkSnapshots = null) {
  const allSnapshots = Array.isArray(session?.poseSnapshots) ? session.poseSnapshots : [];
  const detectedSnapshots = Array.isArray(kinkSnapshots)
    ? kinkSnapshots
    : allSnapshots.filter((snapshot) => snapshot.kinkDetected);
  const derivedSummary = summarizeSnapshots(allSnapshots);
  const sessionSummary = session?.sessionSummary || {};

  return {
    sessionId: session?._id,
    userId: session?.userId,
    groupId: session?.groupId,
    exerciseType: session?.exerciseType,
    totalKinks: Math.max(Number(sessionSummary.totalKinks) || 0, derivedSummary.totalKinks),
    averageFluidity:
      Number(sessionSummary.averageFluidity) > 0
        ? Number(sessionSummary.averageFluidity)
        : derivedSummary.averageFluidity,
    maxFluidity:
      Number(sessionSummary.maxFluidity) > 0
        ? Number(sessionSummary.maxFluidity)
        : derivedSummary.maxFluidity,
    kinkSnapshots: serializeSnapshots(detectedSnapshots),
  };
}

module.exports = buildWipeoutPayload;
