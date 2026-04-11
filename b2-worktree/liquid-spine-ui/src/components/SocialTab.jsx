import React, { useEffect, useState } from 'react';

const PROFILE_STORAGE_KEY = 'formflow-profile-private';

const SocialTab = () => {
  const [view, setView] = useState('lobby');
  const [isPrivate, setIsPrivate] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const storedValue = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return storedValue === null ? true : storedValue === 'true';
  });

  useEffect(() => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, String(isPrivate));
  }, [isPrivate]);

  if (view === 'contest') {
    return (
      <div className="glass-panel contest-card">
        <button type="button" onClick={() => setView('lobby')} className="back-button">
          ← Squad lobby
        </button>
        <h3 style={{ color: 'var(--moana-coral)', textAlign: 'center' }}>
          WORST REP CAPTION CONTEST
        </h3>
        <div className="contest-media">
          <span style={{ fontSize: '0.8rem', opacity: 0.55 }}>
            [ IMAGE: Mike&apos;s back-breaking squat ]
            <br />
            User: @WaveRunner
          </span>
        </div>
        <input
          type="text"
          placeholder="Add a funny caption..."
          className="contest-input"
        />
        <button type="button" className="primary-button social-action">
          Vote for funniest
        </button>
      </div>
    );
  }

  return (
    <div className="social-layout">
      <div className="glass-panel split-panel">
        <div>
          <h4 style={{ margin: 0 }}>PROFILE TYPE</h4>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
            {isPrivate ? 'Private (Friends Only)' : 'Public'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsPrivate((currentValue) => !currentValue)}
          className="ghost-button compact-button"
        >
          {isPrivate ? 'Switch to public' : 'Make private'}
        </button>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginTop: 0 }}>THE SWELL SQUAD</h3>
        <div className="feature-grid">
          <button type="button" className="feature-button">
            IMPORT CONTACTS
          </button>
          <button type="button" className="feature-button">
            SEND INVITE LINK
          </button>
        </div>

        <div className="social-layout">
          <button
            type="button"
            onClick={() => setView('contest')}
            className="feature-card feature-card-coral"
          >
            <strong>FORM BATTLE: CAPTION CONTEST</strong>
            <p className="card-copy">
              3 new worst reps submitted. Jump in and rate the best caption.
            </p>
          </button>

          <div className="feature-card feature-card-cyan">
            <strong>PR CHECK: DEADLIFT DAY</strong>
            <p className="card-copy">Sarah is leading the board with 180 kg.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialTab;
