import React, { useState } from 'react';

const STATUS_LABELS = {
  connecting: 'Connecting feed',
  connected: 'Live feed online',
  disconnected: 'Feed disconnected',
  error: 'Socket issue',
};

const Header = ({
  playerScore,
  combo,
  selectedLevel,
  playerProfile,
  realtimeStatus,
  isWipeoutActive,
  onAddHydrationCredits,
}) => {
  const [hydrationInput, setHydrationInput] = useState('1');
  const [hydrationStatus, setHydrationStatus] = useState('');
  const [isHydrationSubmitting, setIsHydrationSubmitting] = useState(false);

  const handleHydrationSubmit = async (event) => {
    event.preventDefault();

    const credits = Number(hydrationInput);

    if (!Number.isFinite(credits) || credits <= 0) {
      setHydrationStatus('Enter a positive number.');
      return;
    }

    setHydrationStatus('');
    setIsHydrationSubmitting(true);

    try {
      await onAddHydrationCredits?.(credits);
      setHydrationStatus(`+${credits} hydration added`);
      setHydrationInput('1');
    } catch (error) {
      setHydrationStatus(error.message || 'Could not add hydration.');
    } finally {
      setIsHydrationSubmitting(false);
    }
  };

  return (
    <header className="app-header">
      <div>
        <p className="session-kicker">
          {playerProfile?.username
            ? `${playerProfile.username} live dashboard`
            : 'Training Session'}
        </p>
        <h1 className="app-title">FORMFLOW</h1>
        <div className="header-meta-row">
          <div className={`level-pill level-pill-${selectedLevel}`}>
            {selectedLevel === 'pro' ? 'Pro Level' : 'Beginner Level'}
          </div>
          <div
            className={`signal-pill is-${realtimeStatus} ${isWipeoutActive ? 'is-alert' : ''}`}
          >
            {STATUS_LABELS[realtimeStatus] || 'Live feed offline'}
          </div>
        </div>
      </div>

      <div className="header-stats">
        <div className="glass-panel score-card score-card-hydration">
          <div className="stat-label">HYDRATION</div>
          <div className="stat-value">{playerProfile?.hydrationCredits ?? '--'}</div>
          <form className="hydration-form" onSubmit={handleHydrationSubmit}>
            <input
              className="hydration-input"
              type="number"
              min="1"
              step="1"
              value={hydrationInput}
              onChange={(event) => setHydrationInput(event.target.value)}
              placeholder="1"
              aria-label="Hydration credits to add"
            />
            <button
              type="submit"
              className="hydration-button"
              disabled={isHydrationSubmitting}
            >
              {isHydrationSubmitting ? '...' : 'Add'}
            </button>
          </form>
          {hydrationStatus && (
            <div className="hydration-feedback">{hydrationStatus}</div>
          )}
        </div>

        <div className="glass-panel score-card">
          <div className="stat-label">SCORE</div>
          <div className="stat-value">{playerScore}</div>
        </div>

        <div className={`glass-panel combo-pill ${combo > 0 ? 'is-hot' : ''}`}>
          <div className="stat-label">COMBO</div>
          <div className="stat-value">x{combo}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
