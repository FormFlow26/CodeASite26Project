import React from 'react';

const BottomNav = ({ activeTab, setActiveTab }) => {
  return (
    <div className="glass-panel bottom-nav">
      <button
        type="button"
        className={`nav-button ${activeTab === 'home' ? 'is-active-home' : ''}`}
        onClick={() => setActiveTab('home')}
        aria-pressed={activeTab === 'home'}
      >
        🏠 HOME
      </button>

      <button
        type="button"
        className={`nav-button ${activeTab === 'main' ? 'is-active-main' : ''}`}
        onClick={() => setActiveTab('main')}
        aria-pressed={activeTab === 'main'}
      >
        💧 THE GYM
      </button>

      <button
        type="button"
        className={`nav-button ${activeTab === 'social' ? 'is-active-social' : ''}`}
        onClick={() => setActiveTab('social')}
        aria-pressed={activeTab === 'social'}
      >
        🌐 SOCIAL HUB
      </button>
    </div>
  );
};

export default BottomNav;
