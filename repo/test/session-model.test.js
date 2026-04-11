const test = require("node:test");
const assert = require("node:assert/strict");

const Session = require("../src/models/Session");

test("filterPoseSnapshots preserves kink events and throttles normal snapshots", () => {
  const baseTime = new Date("2026-04-11T12:00:00.000Z").getTime();
  const snapshots = [
    { timestamp: new Date(baseTime), fluidityScore: 90, kinkDetected: false },
    { timestamp: new Date(baseTime + 200), fluidityScore: 88, kinkDetected: false },
    { timestamp: new Date(baseTime + 300), fluidityScore: 72, kinkDetected: true, flags: ["lumbar_flex"] },
    { timestamp: new Date(baseTime + 900), fluidityScore: 84, kinkDetected: false }
  ];

  const filtered = Session.filterPoseSnapshots(snapshots);

  assert.equal(filtered.length, 3);
  assert.equal(filtered[0].fluidityScore, 90);
  assert.equal(filtered[1].kinkDetected, true);
  assert.equal(filtered[2].fluidityScore, 84);
});

test("calculateSessionSummary computes aggregate fluidity and kinks", () => {
  const summary = Session.calculateSessionSummary([
    { fluidityScore: 80, kinkDetected: false },
    { fluidityScore: 60, kinkDetected: true },
    { fluidityScore: 100, kinkDetected: false }
  ]);

  assert.deepEqual(summary, {
    averageFluidity: 80,
    totalKinks: 1,
    maxFluidity: 100
  });
});
