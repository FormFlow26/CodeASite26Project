import React from 'react';

const OnboardingModal = ({
  hasOnboarded,
  selectedLevel,
  onComplete,
  onSelectLevel,
  onGoToGym,
  onGoToSocial,
  onBack,
}) => {
  if (hasOnboarded) {
    return (
      <div className="main-content home-layout">
        <div className="glass-panel home-hero">
          {onBack && (
            <button type="button" className="page-back-button home-back-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <p className="session-kicker">Home Base</p>
          <h2 className="home-title">Welcome Back to FormFlow</h2>
          <p className="home-copy">
            Jump back in anytime to keep your training, score, and social
            momentum moving.
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
    <div className="onboarding-overlay">
      <div className="glass-panel onboarding-popup">
        {onBack && (
          <button type="button" className="page-back-button modal-back-button" onClick={onBack}>
            ← Back
          </button>
        )}
        <h2 className="home-title">Welcome to FormFlow</h2>
        <p className="home-copy onboarding-copy">
          To calibrate your water limits and skill tree, select your starting
          class.
        </p>

        <div className="onboarding-option-stack">
          <button
            type="button"
            onClick={() => onComplete('beginner')}
            className="onboarding-option onboarding-option-cyan"
          >
            <span className="home-class-title">🌱 Beginner Level</span>
            <span className="home-class-copy">
              Guided form coaching and a calmer intro to the gym flow.
            </span>
          </button>

          <button
            type="button"
            onClick={() => onComplete('pro')}
            className="onboarding-option onboarding-option-coral"
          >
            <span className="home-class-title">🔱 Pro Level</span>
            <span className="home-class-copy">
              Competitive energy and faster feedback for advanced training.
            </span>
          </button>
        </div>

        <button type="button" onClick={onGoToGym} className="ghost-button onboarding-skip">
          Skip for now and open the gym
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
