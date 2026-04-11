function createEmptyAngles() {
  return {
    hipAngle: 0,
    kneeAngle: 0,
    lumbarFlexion: 0
  };
}

function summarizeSnapshots(snapshots) {
  if (snapshots.length === 0) {
    return {
      avgFluidity: 0,
      peakAngles: createEmptyAngles(),
      allFlags: [],
      kinkDetected: false
    };
  }

  const summary = {
    avgFluidity: 0,
    peakAngles: createEmptyAngles(),
    allFlags: new Set(),
    kinkDetected: false
  };

  for (const snapshot of snapshots) {
    summary.avgFluidity += snapshot.fluidityScore || 0;
    summary.peakAngles.hipAngle = Math.max(summary.peakAngles.hipAngle, snapshot.angles?.hipAngle || 0);
    summary.peakAngles.kneeAngle = Math.max(summary.peakAngles.kneeAngle, snapshot.angles?.kneeAngle || 0);
    summary.peakAngles.lumbarFlexion = Math.max(
      summary.peakAngles.lumbarFlexion,
      snapshot.angles?.lumbarFlexion || 0
    );
    summary.kinkDetected = summary.kinkDetected || Boolean(snapshot.kinkDetected);

    for (const flag of snapshot.flags || []) {
      summary.allFlags.add(flag);
    }
  }

  return {
    avgFluidity: Number((summary.avgFluidity / snapshots.length).toFixed(2)),
    peakAngles: summary.peakAngles,
    allFlags: Array.from(summary.allFlags),
    kinkDetected: summary.kinkDetected
  };
}

export function createSnapshotBuffer() {
  let snapshots = [];

  return {
    push(snapshot) {
      if (!snapshot) {
        return snapshots.length;
      }

      snapshots.push(snapshot);
      return snapshots.length;
    },
    flush() {
      const bufferedSnapshots = snapshots;
      snapshots = [];
      return bufferedSnapshots;
    },
    getRepSummary() {
      return summarizeSnapshots(snapshots);
    },
    size() {
      return snapshots.length;
    }
  };
}
