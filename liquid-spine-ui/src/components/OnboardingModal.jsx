import React from 'react';

const OnboardingModal = ({
  hasOnboarded,
  selectedLevel,
  onComplete,
  onSelectLevel,
  onGoToGym,
  onGoToSocial,
}) => {
  if (hasOnboarded) {
    return (
      <div className="main-content home-layout">
        <div className="glass-panel home-hero">
          <p className="session-kicker">Home Base</p>
          <h2 className="home-title">Welcome Back to FormFlow</h2>
          <p className="home-copy">
            This is now a real home page, so you can jump back here anytime from
            the navigation and still land here again after a refresh.
          </p>

          <div className="level-switch">
            <button
              type="button"
              onClick={() => onSelectLevel('beginner')}
              className={`level-toggle ${selectedLevel === 'beginner' ? 'is-selected' : ''}`}
            >
              Beginner
            </button>
            <button
              type="button"
              onClick={() => onSelectLevel('pro')}
              className={`level-toggle ${selectedLevel === 'pro' ? 'is-selected is-pro' : ''}`}
            >
              Pro
            </button>
          </div>

          <div className="home-action-grid">
            <button type="button" onClick={onGoToGym} className="primary-button">
              Resume gym session
            </button>
            <button type="button" onClick={onGoToSocial} className="ghost-button">
              Open social hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content home-layout">
      <div className="glass-panel home-hero home-hero-onboarding">
        <p className="session-kicker">Welcome Sequence</p>
        <h2 className="home-title">Welcome to FormFlow</h2>
        <p className="home-copy">
          To calibrate your water limits and skill tree, select your starting
          class. After this, the Home button will always bring you back here.
        </p>

        <div className="home-action-stack">
          <button
            type="button"
            onClick={() => onComplete('beginner')}
            className="home-class-card home-class-card-cyan"
          >
            <span className="home-class-title">🌱 Beginner Level</span>
            <span className="home-class-copy">
              Guided form coaching, calmer pace, and a friendlier intro to the gym flow.
            </span>
          </button>

          <button
            type="button"
            onClick={() => onComplete('pro')}
            className="home-class-card home-class-card-coral"
          >
            <span className="home-class-title">🔱 Pro Level</span>
            <span className="home-class-copy">
              Faster feedback, competitive energy, and a more advanced training vibe.
            </span>
          </button>
        </div>

        <button type="button" onClick={onGoToGym} className="ghost-button">
          Skip for now and open the gym
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
