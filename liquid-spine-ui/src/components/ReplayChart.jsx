import React from 'react';

const ReplayChart = ({ snapshots }) => {
  if (!snapshots?.length) {
    return <p className="replay-empty">No pose snapshots available yet.</p>;
  }

  const visibleSnapshots = snapshots.slice(-24);
  const maxFluidity = Math.max(
    ...visibleSnapshots.map((snapshot) => snapshot.fluidityScore || 0),
    100,
  );

  return (
    <div className="replay-chart-shell">
      <div className="replay-chart">
        {visibleSnapshots.map((snapshot, index) => {
          const height = Math.max(
            14,
            Math.round(((snapshot.fluidityScore || 0) / maxFluidity) * 100),
          );

          return (
            <div
              key={`${snapshot.timestamp}-${index}`}
              className={`replay-bar ${snapshot.kinkDetected ? 'is-kink' : ''}`}
              style={{ height: `${height}%` }}
              title={`Fluidity ${Math.round(snapshot.fluidityScore || 0)}`}
            />
          );
        })}
      </div>
      <div className="replay-caption">
        <span>Low fluidity</span>
        <span>High fluidity</span>
      </div>
    </div>
  );
};

export default ReplayChart;
