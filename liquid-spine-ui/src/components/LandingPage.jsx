import React from 'react';

const LANDING_FEATURES = [
  'Realtime posture scoring',
  'Competitive leaderboard energy',
  'Coach-ready recovery replay',
];

const LandingPage = ({ onStart }) => {
  return (
    <div className="landing-screen">
      <div className="landing-ambient landing-ambient-cyan" />
      <div className="landing-ambient landing-ambient-coral" />
      <div className="landing-grid-lines" />

      <div className="landing-shell">
        <div className="landing-copy-block">
          <p className="session-kicker">Performance Platform</p>
          <span className="landing-chip">Interactive Fitness Experience</span>
          <h1 className="landing-title">
            Movement coaching
            <br />
            with game-level energy.
          </h1>
          <p className="landing-copy">
            FormFlow turns posture feedback, session recovery, and competition into a
            product experience that feels premium from the first screen.
          </p>

          <div className="landing-feature-row">
            {LANDING_FEATURES.map((feature) => (
              <span key={feature} className="landing-feature-pill">
                {feature}
              </span>
            ))}
          </div>

          <div className="landing-live-strip">
            <div className="landing-live-chip">
              <span>Mode</span>
              <strong>Live Training</strong>
            </div>
            <div className="landing-live-chip">
              <span>Energy</span>
              <strong>Gym Arena</strong>
            </div>
            <div className="landing-live-chip">
              <span>Output</span>
              <strong>Coach + Player</strong>
            </div>
          </div>

          <div className="landing-action-row">
            <button
              type="button"
              className="primary-button landing-primary"
              onClick={() => onStart?.('signup')}
            >
              Sign Up Free
            </button>
            <button
              type="button"
              className="secondary-button landing-secondary"
              onClick={() => onStart?.('login')}
            >
              Continue to Login
            </button>
          </div>
        </div>

        <div className="glass-panel landing-showcase">
          <div className="landing-gym-stage" aria-hidden="true">
            <div className="landing-gym-backdrop" />
            <div className="landing-gym-platform" />
            <div className="landing-athlete-shadow" />

            <div className="landing-barbell">
              <span className="landing-plate landing-plate-left-outer" />
              <span className="landing-plate landing-plate-left-inner" />
              <span className="landing-bar" />
              <span className="landing-plate landing-plate-right-inner" />
              <span className="landing-plate landing-plate-right-outer" />
            </div>

            <div className="landing-athlete">
              <span className="landing-athlete-head" />
              <span className="landing-athlete-torso" />
              <span className="landing-athlete-arm landing-athlete-arm-left" />
              <span className="landing-athlete-arm landing-athlete-arm-right" />
              <span className="landing-athlete-leg landing-athlete-leg-left" />
              <span className="landing-athlete-leg landing-athlete-leg-right" />
            </div>

            <div className="landing-gym-pulse landing-gym-pulse-1" />
            <div className="landing-gym-pulse landing-gym-pulse-2" />
            <div className="landing-gym-pulse landing-gym-pulse-3" />

            <div className="landing-tracker-card landing-tracker-card-top">
              <span>Form Sync</span>
              <strong>98%</strong>
            </div>
            <div className="landing-tracker-card landing-tracker-card-bottom">
              <span>Rep Velocity</span>
              <strong>LIVE</strong>
            </div>
          </div>

          <div className="landing-showcase-top">
            <span className="landing-metric-label">Live Demo Value</span>
            <strong className="landing-metric-value">Realtime coaching + social motivation</strong>
          </div>

          <div className="landing-motion-stage" aria-hidden="true">
            <div className="landing-motion-ring landing-motion-ring-outer" />
            <div className="landing-motion-ring landing-motion-ring-inner" />
            <div className="landing-motion-orbit" />
            <div className="landing-motion-core">
              <span className="landing-motion-core-label">Motion</span>
            </div>
            <div className="landing-scan-line" />
            <div className="landing-wave-trail">
              <span className="landing-wave-node landing-wave-node-1" />
              <span className="landing-wave-node landing-wave-node-2" />
              <span className="landing-wave-node landing-wave-node-3" />
              <span className="landing-wave-node landing-wave-node-4" />
              <span className="landing-wave-node landing-wave-node-5" />
            </div>
          </div>

          <div className="landing-showcase-grid">
            <div className="landing-showcase-card">
              <span>Feedback</span>
              <strong>Instant</strong>
            </div>
            <div className="landing-showcase-card">
              <span>Retention Hook</span>
              <strong>Leaderboard</strong>
            </div>
            <div className="landing-showcase-card">
              <span>Review Mode</span>
              <strong>Replay</strong>
            </div>
            <div className="landing-showcase-card">
              <span>Feel</span>
              <strong>Game UI</strong>
            </div>
          </div>

          <div className="landing-wave-card">
            <div className="landing-wave-bar landing-wave-bar-short" />
            <div className="landing-wave-bar landing-wave-bar-medium" />
            <div className="landing-wave-bar landing-wave-bar-tall" />
            <div className="landing-wave-bar landing-wave-bar-medium" />
            <div className="landing-wave-bar landing-wave-bar-short" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
