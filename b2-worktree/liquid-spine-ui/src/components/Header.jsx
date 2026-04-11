import React from 'react';

const Header = ({ playerScore, combo, selectedLevel }) => {
  return (
    <header className="app-header">
      <div>
        <p className="session-kicker">Training Session</p>
        <h1 className="app-title">FORMFLOW</h1>
        <div className={`level-pill level-pill-${selectedLevel}`}>
          {selectedLevel === 'pro' ? 'Pro Level' : 'Beginner Level'}
        </div>
      </div>

      <div className="header-stats">
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
