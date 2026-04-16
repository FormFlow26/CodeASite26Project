import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
  connecting: { label: 'Connecting', color: '#3d5a80', dot: '#3d5a80' },
  connected: { label: 'Live', color: '#00f2fe', dot: '#00f2fe' },
  disconnected: { label: 'Offline', color: '#7a9bbf', dot: '#7a9bbf' },
  error: { label: 'Error', color: '#ff4d6d', dot: '#ff4d6d' },
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
  const [showHydrationForm, setShowHydrationForm] = useState(false);

  const status = STATUS_CONFIG[realtimeStatus] || STATUS_CONFIG.disconnected;

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
      setHydrationStatus(`+${credits} added`);
      setHydrationInput('1');
      setTimeout(() => setHydrationStatus(''), 2000);
    } catch (error) {
      setHydrationStatus(error.message || 'Could not add hydration.');
    } finally {
      setIsHydrationSubmitting(false);
    }
  };

  return (
    <header className="flex items-start justify-between gap-4 mb-5">
      {/* Left: branding */}
      <div className="min-w-0">
        <p
          className="text-[10px] font-bold tracking-widest uppercase mb-0.5"
          style={{ color: '#3d5a80' }}
        >
          {playerProfile?.username ? `${playerProfile.username}` : 'Training Session'}
        </p>
        <h1
          className="text-2xl font-bold tracking-tight leading-none mb-2"
          style={{ color: '#f0f6ff' }}
        >
          FORMFLOW
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Level pill */}
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase"
            style={{
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              color: '#00f2fe',
            }}
          >
            {selectedLevel === 'pro' ? 'Pro' : 'Beginner'}
          </span>

          {/* Realtime status */}
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{
              background: isWipeoutActive
                ? 'rgba(255, 77, 109, 0.12)'
                : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isWipeoutActive ? 'rgba(255,77,109,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: isWipeoutActive ? '#ff4d6d' : status.color,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: isWipeoutActive ? '#ff4d6d' : status.dot,
                boxShadow: realtimeStatus === 'connected' ? `0 0 6px ${status.dot}` : 'none',
              }}
            />
            {isWipeoutActive ? 'Wipeout!' : status.label}
          </span>
        </div>
      </div>

      {/* Right: stats */}
      <div className="flex items-start gap-2 flex-shrink-0">
        {/* Score */}
        <div
          className="flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[52px]"
          style={{
            background: 'rgba(13, 31, 53, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: '#3d5a80' }}>Score</span>
          <motion.span
            key={playerScore}
            initial={{ scale: 1.15, color: '#00f2fe' }}
            animate={{ scale: 1, color: '#f0f6ff' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-base font-bold leading-none"
          >
            {playerScore}
          </motion.span>
        </div>

        {/* Combo */}
        <div
          className="flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[48px]"
          style={{
            background: combo > 0 ? 'rgba(0, 242, 254, 0.08)' : 'rgba(13, 31, 53, 0.8)',
            border: `1px solid ${combo > 0 ? 'rgba(0,242,254,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          <span className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: '#3d5a80' }}>Combo</span>
          <motion.span
            key={combo}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-base font-bold leading-none"
            style={{ color: combo > 0 ? '#00f2fe' : '#7a9bbf' }}
          >
            ×{combo}
          </motion.span>
        </div>

        {/* Hydration */}
        <div className="relative">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowHydrationForm((v) => !v)}
            className="flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[56px]"
            style={{
              background: 'rgba(13, 31, 53, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: '#3d5a80' }}>Hydration</span>
            <span className="text-base font-bold leading-none" style={{ color: '#f0f6ff' }}>
              {playerProfile?.hydrationCredits ?? '--'}
            </span>
          </motion.button>

          <AnimatePresence>
            {showHydrationForm && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute right-0 top-full mt-2 z-50 p-3 rounded-xl w-44"
                style={{
                  background: '#0d1f35',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                }}
              >
                <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#3d5a80' }}>Add Credits</p>
                <form onSubmit={handleHydrationSubmit} className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={hydrationInput}
                    onChange={(e) => setHydrationInput(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-sm font-medium focus:outline-none focus:border-[#00f2fe]"
                    style={{
                      background: 'rgba(5, 17, 31, 0.8)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f0f6ff',
                      fontSize: '16px',
                      width: '60px',
                    }}
                    aria-label="Credits to add"
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.95 }}
                    disabled={isHydrationSubmitting}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                      color: '#05111f',
                    }}
                  >
                    {isHydrationSubmitting ? '...' : 'Add'}
                  </motion.button>
                </form>
                {hydrationStatus && (
                  <p className="mt-1.5 text-[10px]" style={{ color: hydrationStatus.startsWith('+') ? '#00f2fe' : '#ff4d6d' }}>
                    {hydrationStatus}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
