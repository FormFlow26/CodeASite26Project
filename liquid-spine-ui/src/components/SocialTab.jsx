import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/formflowApi';

const PROFILE_STORAGE_KEY = 'formflow-profile-private';
const PODIUM_LABELS = ['Hydro King', 'Surge Queen', 'Wave Breaker'];

const SocialTab = ({ playerProfile, currentUserId, realtimeStatus }) => {
  const [isPrivate, setIsPrivate] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const storedValue = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return storedValue === null ? true : storedValue === 'true';
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState('loading');
  const [leaderboardError, setLeaderboardError] = useState('');

  useEffect(() => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, String(isPrivate));
  }, [isPrivate]);

  useEffect(() => {
    let isCancelled = false;
    let intervalId;

    async function loadLeaderboard() {
      try {
        setLeaderboardStatus('loading');
        const entries = await getLeaderboard();

        if (!isCancelled) {
          setLeaderboard(entries);
          setLeaderboardStatus('ready');
          setLeaderboardError('');
        }
      } catch (error) {
        if (!isCancelled) {
          setLeaderboardStatus('error');
          setLeaderboardError(error.message);
        }
      }
    }

    loadLeaderboard();
    intervalId = window.setInterval(loadLeaderboard, 12000);

    return () => {
      isCancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const maxFluidityScore = leaderboard.reduce(
    (highestScore, entry) =>
      Math.max(highestScore, Math.round(entry.maxFluidity ?? entry.highestFluidityScore ?? 0)),
    1,
  );
  const podiumEntries = leaderboard.slice(0, 3);

  return (
    <div className="social-layout">
      <div className="glass-panel split-panel">
        <div>
          <h4 style={{ margin: 0 }}>PROFILE TYPE</h4>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
            {isPrivate ? 'Private (Friends Only)' : 'Public'}
          </span>
        </div>
        <div className="profile-summary">
          <strong>
            {playerProfile
              ? `${playerProfile.hydrationCredits ?? 0} hydration credits`
              : 'No linked profile'}
          </strong>
          <span>
            {realtimeStatus === 'connected'
              ? 'Realtime sync connected'
              : 'Realtime sync offline'}
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
        <div className="leaderboard-header">
          <div>
            <h3 style={{ margin: 0 }}>LIVE HYDRATION LEADERBOARD</h3>
            <p className="card-copy">
              Rankings update from the live backend as training sessions are recorded.
            </p>
          </div>
          <div className="leaderboard-badge">{leaderboard.length || 0} athletes</div>
        </div>

        {leaderboardStatus === 'loading' && (
          <div className="status-banner" data-tone="info">
            Loading leaderboard...
          </div>
        )}

        {leaderboardStatus === 'error' && (
          <div className="status-banner" data-tone="warning">
            Leaderboard unavailable right now: {leaderboardError}
          </div>
        )}

        {leaderboardStatus === 'ready' && (
          leaderboard.length > 0 ? (
            <>
              <div className="leaderboard-podium-strip">
                {podiumEntries.map((entry, index) => {
                  const isCurrentUser = currentUserId
                    ? String(entry.userId) === String(currentUserId)
                    : false;

                  return (
                    <div
                      key={`${entry.userId}-podium`}
                      className={`leaderboard-podium-chip leaderboard-podium-chip-${index + 1} ${
                        isCurrentUser ? 'is-current' : ''
                      }`}
                    >
                      <span className="leaderboard-podium-place">#{index + 1}</span>
                      <strong className="leaderboard-podium-title">
                        {PODIUM_LABELS[index] || 'Arena Hero'}
                      </strong>
                      <div className="leaderboard-podium-name">
                        {entry.username || 'Unknown athlete'}
                      </div>
                      <div className="leaderboard-podium-meta">
                        <strong>
                          {Math.round(entry.maxFluidity ?? entry.highestFluidityScore ?? 0)}
                        </strong>
                        <span>{entry.hydrationCredits ?? 0} credits</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="leaderboard-list">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = currentUserId
                    ? String(entry.userId) === String(currentUserId)
                    : false;
                  const fluidityScore = Math.round(
                    entry.maxFluidity ?? entry.highestFluidityScore ?? 0,
                  );
                  const progressWidth = `${Math.max(
                    12,
                    Math.round((fluidityScore / maxFluidityScore) * 100),
                  )}%`;

                  return (
                    <div
                      key={`${entry.userId}-${index}`}
                      className={`leaderboard-row leaderboard-row-game ${
                        isCurrentUser ? 'is-current' : ''
                      }`}
                    >
                      <div className="leaderboard-rank-badge">
                        <div className="leaderboard-rank">#{index + 1}</div>
                      </div>
                      <div className="leaderboard-user">
                        <div className="leaderboard-user-top">
                          <strong>{entry.username || 'Unknown athlete'}</strong>
                          {isCurrentUser && <span className="leaderboard-you-tag">YOU</span>}
                        </div>
                        <span>{entry.latestExerciseType || 'Mixed session'}</span>
                        <div className="leaderboard-power-track">
                          <div
                            className="leaderboard-power-fill"
                            style={{ width: progressWidth }}
                          />
                        </div>
                      </div>
                      <div className="leaderboard-metrics">
                        <strong>{fluidityScore}</strong>
                        <span>{entry.hydrationCredits ?? 0} credits</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="status-banner" data-tone="info">
              No leaderboard data has been recorded yet.
            </div>
          )
        )}
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
          <div className="feature-card feature-card-coral">
            <strong>SESSION HIGHLIGHTS</strong>
            <p className="card-copy">
              Flagged reps and standout recovery moments can surface here for quick team review.
            </p>
          </div>

          <div className="feature-card feature-card-cyan">
            <strong>LIVE FEED STATUS</strong>
            <p className="card-copy">
              {realtimeStatus === 'connected'
                ? 'Realtime alerts are connected and ready to update the dashboard.'
                : 'Realtime sync will appear here once the backend connection is live.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialTab;
