import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLeaderboard } from '../lib/formflowApi';

const PROFILE_STORAGE_KEY = 'formflow-profile-private';
const PODIUM_LABELS = ['Hydro King', 'Surge Queen', 'Wave Breaker'];
const PODIUM_ACCENT = ['#00f2fe', '#6366f1', '#7a9bbf'];

const Card = ({ children, className = '', style = {} }) => (
  <div
    className={`rounded-2xl p-4 ${className}`}
    style={{
      background: 'rgba(13, 31, 53, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      ...style,
    }}
  >
    {children}
  </div>
);

const SocialTab = ({ playerProfile, currentUserId, realtimeStatus }) => {
  const [isPrivate, setIsPrivate] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
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
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  const maxFluidityScore = leaderboard.reduce(
    (high, e) => Math.max(high, Math.round(e.maxFluidity ?? e.highestFluidityScore ?? 0)),
    1,
  );
  const podiumEntries = leaderboard.slice(0, 3);

  const isLive = realtimeStatus === 'connected';

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Profile card */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold mb-0.5" style={{ color: '#f0f6ff' }}>
              {playerProfile ? (playerProfile.username || 'Your Profile') : 'No Profile'}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{
                  background: isLive ? 'rgba(0,242,254,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isLive ? 'rgba(0,242,254,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  color: isLive ? '#00f2fe' : '#3d5a80',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: isLive ? '#00f2fe' : '#3d5a80' }}
                />
                {isLive ? 'Live sync' : 'Offline'}
              </span>
              <span className="text-[10px]" style={{ color: '#3d5a80' }}>
                {isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {playerProfile && (
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-widest block" style={{ color: '#3d5a80' }}>Hydration</span>
                <span className="text-lg font-bold" style={{ color: '#f0f6ff' }}>
                  {playerProfile.hydrationCredits ?? 0}
                </span>
              </div>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPrivate((v) => !v)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#7a9bbf',
              }}
            >
              {isPrivate ? 'Go Public' : 'Go Private'}
            </motion.button>
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#f0f6ff' }}>Leaderboard</h3>
            <p className="text-xs mt-0.5" style={{ color: '#3d5a80' }}>Ranked by max fluidity score</p>
          </div>
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(0,242,254,0.08)',
              border: '1px solid rgba(0,242,254,0.15)',
              color: '#00f2fe',
            }}
          >
            {leaderboard.length} athletes
          </span>
        </div>

        {leaderboardStatus === 'loading' && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              />
            ))}
          </div>
        )}

        {leaderboardStatus === 'error' && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)', color: '#ff4d6d' }}
          >
            {leaderboardError}
          </div>
        )}

        {leaderboardStatus === 'ready' && leaderboard.length === 0 && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(0,242,254,0.05)', border: '1px solid rgba(0,242,254,0.1)', color: '#7a9bbf' }}
          >
            No leaderboard data yet.
          </div>
        )}

        {leaderboardStatus === 'ready' && leaderboard.length > 0 && (
          <>
            {/* Podium top 3 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {podiumEntries.map((entry, i) => {
                const isMe = currentUserId ? String(entry.userId) === String(currentUserId) : false;
                const score = Math.round(entry.maxFluidity ?? entry.highestFluidityScore ?? 0);
                return (
                  <div
                    key={`${entry.userId}-podium`}
                    className="flex flex-col items-center py-3 px-2 rounded-xl text-center"
                    style={{
                      background: isMe ? 'rgba(0,242,254,0.08)' : 'rgba(5,17,31,0.6)',
                      border: `1px solid ${isMe ? 'rgba(0,242,254,0.2)' : 'rgba(255,255,255,0.04)'}`,
                    }}
                  >
                    <span className="text-lg font-bold mb-0.5" style={{ color: PODIUM_ACCENT[i] }}>
                      #{i + 1}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: PODIUM_ACCENT[i] }}>
                      {PODIUM_LABELS[i]}
                    </span>
                    <span className="text-xs font-medium truncate w-full" style={{ color: '#7a9bbf' }}>
                      {entry.username || 'Unknown'}
                    </span>
                    <span className="text-sm font-bold mt-1" style={{ color: '#f0f6ff' }}>{score}</span>
                  </div>
                );
              })}
            </div>

            {/* Full list */}
            <div className="flex flex-col gap-1.5">
              {leaderboard.map((entry, i) => {
                const isMe = currentUserId ? String(entry.userId) === String(currentUserId) : false;
                const score = Math.round(entry.maxFluidity ?? entry.highestFluidityScore ?? 0);
                const barWidth = `${Math.max(10, Math.round((score / maxFluidityScore) * 100))}%`;

                return (
                  <motion.div
                    key={`${entry.userId}-${i}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: isMe ? 'rgba(0,242,254,0.06)' : 'rgba(5,17,31,0.4)',
                      border: `1px solid ${isMe ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.03)'}`,
                    }}
                  >
                    <span
                      className="text-xs font-bold w-6 text-center flex-shrink-0"
                      style={{ color: i < 3 ? PODIUM_ACCENT[i] : '#3d5a80' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-semibold truncate" style={{ color: '#f0f6ff' }}>
                          {entry.username || 'Unknown'}
                        </span>
                        {isMe && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: 'rgba(0,242,254,0.15)', color: '#00f2fe' }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: barWidth }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          style={{
                            background: isMe
                              ? '#00f2fe'
                              : 'rgba(255,255,255,0.12)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold" style={{ color: '#f0f6ff' }}>{score}</span>
                      <span className="text-[10px] block" style={{ color: '#3d5a80' }}>
                        {entry.hydrationCredits ?? 0} cr
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Squad card */}
      <Card>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#f0f6ff' }}>The Swell Squad</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {['Import Contacts', 'Send Invite Link'].map((label) => (
            <motion.button
              key={label}
              type="button"
              whileTap={{ scale: 0.95 }}
              className="py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#7a9bbf',
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div
            className="px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255, 77, 109, 0.06)', border: '1px solid rgba(255,77,109,0.12)' }}
          >
            <span className="text-xs font-bold block mb-1" style={{ color: '#ff4d6d' }}>Session Highlights</span>
            <p className="text-xs" style={{ color: '#7a9bbf' }}>
              Flagged reps and standout recovery moments surface here for team review.
            </p>
          </div>
          <div
            className="px-4 py-3 rounded-xl"
            style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0,242,254,0.1)' }}
          >
            <span className="text-xs font-bold block mb-1" style={{ color: '#00f2fe' }}>Live Feed Status</span>
            <p className="text-xs" style={{ color: '#7a9bbf' }}>
              {isLive
                ? 'Realtime alerts connected and updating the dashboard.'
                : 'Realtime sync appears here once the backend connection is live.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SocialTab;
