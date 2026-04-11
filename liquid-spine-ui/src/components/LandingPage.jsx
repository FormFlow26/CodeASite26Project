import React from 'react';
import fitnessDuoCyan from '../assets/fitness-duo-cyan.png';

const LANDING_FEATURES = [
  'AI form coaching',
  'Live score loops',
  'Retention-first social play',
];

const LandingPage = ({ onStart }) => {
  return (
    <div className="landing-screen">
      <div className="landing-ambient landing-ambient-cyan" />
      <div className="landing-ambient landing-ambient-coral" />
      <div className="landing-grid-lines" />

      <div className="landing-shell">
        <div className="landing-copy-block">
          <span className="landing-chip">AI-Powered Fitness Game</span>
          <h1 className="landing-title landing-title-compact">Train. Compete. Conquer.</h1>
          <p className="landing-copy">
            Want to turn every workout into a game you can&apos;t stop playing? FormFlow is
            for you. Powered by AI coaching, real-time scoring, and competitive gameplay.
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
              <span>AI Engine</span>
              <strong>Realtime Coaching</strong>
            </div>
            <div className="landing-live-chip">
              <span>Hook</span>
              <strong>Live Leaderboards</strong>
            </div>
            <div className="landing-live-chip">
              <span>Replay</span>
              <strong>Post-Workout Insights</strong>
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
            <div className="landing-reference-card">
              <img
                src={fitnessDuoCyan}
                alt="Fitness duo in cyan and black"
                className="landing-reference-image landing-reference-image-base"
              />
              <img
                src={fitnessDuoCyan}
                alt=""
                aria-hidden="true"
                className="landing-reference-image landing-reference-image-glow"
              />
              <div className="landing-reference-spotlight landing-reference-spotlight-left" />
              <div className="landing-reference-spotlight landing-reference-spotlight-right" />
              <div className="landing-reference-beam" />
              <div className="landing-reference-shimmer" />
            </div>
          </div>

          <div className="landing-showcase-top">
            <strong className="landing-metric-value">Realtime coaching + social motivation</strong>
          </div>

          <div className="landing-coach-stage" aria-hidden="true">
            <div className="landing-coach-floor" />
            <div className="landing-trophy-badge">
              <span className="landing-trophy-icon">🏆</span>
              <span className="landing-trophy-copy">Boss Reward</span>
            </div>
            <div className="landing-coach-ui-card landing-coach-ui-card-left">
              <span>Mission</span>
              <strong>Beat the daily boss rep challenge</strong>
            </div>
            <div className="landing-equipment-lane">
              <div className="landing-equipment-track" />
              <div className="landing-equipment-track landing-equipment-track-secondary" />
              <div className="landing-equipment landing-equipment-dumbbell-1">
                <span className="landing-dumbbell-plate landing-dumbbell-plate-left-outer" />
                <span className="landing-dumbbell-plate landing-dumbbell-plate-left-inner" />
                <span className="landing-dumbbell-handle" />
                <span className="landing-dumbbell-plate landing-dumbbell-plate-right-inner" />
                <span className="landing-dumbbell-plate landing-dumbbell-plate-right-outer" />
              </div>
              <div className="landing-equipment landing-equipment-dumbbell-2">
                <span className="landing-dumbbell-plate landing-dumbbell-plate-left-outer" />
                <span className="landing-dumbbell-plate landing-dumbbell-plate-left-inner" />
                <span className="landing-dumbbell-handle" />
                <span className="landing-dumbbell-plate landing-dumbbell-plate-right-inner" />
                <span className="landing-dumbbell-plate landing-dumbbell-plate-right-outer" />
              </div>
              <div className="landing-equipment landing-equipment-barbell-mini">
                <span className="landing-barbell-mini-plate landing-barbell-mini-plate-left" />
                <span className="landing-barbell-mini-bar" />
                <span className="landing-barbell-mini-plate landing-barbell-mini-plate-right" />
              </div>
              <div className="landing-equipment landing-equipment-plate">
                <span className="landing-plate-core" />
              </div>
              <div className="landing-equipment landing-equipment-kettlebell">
                <span className="landing-kettlebell-handle" />
              </div>
              <div className="landing-equipment landing-equipment-bench">
                <span className="landing-bench-pad" />
                <span className="landing-bench-leg landing-bench-leg-left" />
                <span className="landing-bench-leg landing-bench-leg-right" />
              </div>
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

          <div className="landing-reward-lane">
            <div className="landing-reward-pill">
              <span>Reward</span>
              <strong>Unlock Pro Arena skin</strong>
            </div>
            <div className="landing-reward-pill">
              <span>Boost</span>
              <strong>+25 Hydration Credits</strong>
            </div>
            <div className="landing-reward-pill">
              <span>Mode</span>
              <strong>Versus Friends</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
