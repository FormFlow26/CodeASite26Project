import React from 'react';

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
}) => {
  return (
    <header className="app-header">
      <div>
        <p className="session-kicker">
          {playerProfile?.username ? `${playerProfile.username} live dashboard` : 'Training Session'}
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
        <div className="glass-panel score-card">
          <div className="stat-label">HYDRATION</div>
          <div className="stat-value">{playerProfile?.hydrationCredits ?? '--'}</div>
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
