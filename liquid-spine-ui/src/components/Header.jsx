import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
  connecting: { label: 'Connecting', color: '#2d4a66' },
  connected: { label: 'Live', color: '#00f2fe' },
  disconnected: { label: 'Offline', color: '#2d4a66' },
  error: { label: 'Error', color: '#ff4d6d' },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const status = STATUS_CONFIG[realtimeStatus] || STATUS_CONFIG.disconnected;

  const handleHydrationSubmit = async (e) => {
    e.preventDefault();
    const credits = Number(hydrationInput);
    if (!Number.isFinite(credits) || credits <= 0) return;
    setIsSubmitting(true);
    try {
      await onAddHydrationCredits?.(credits);
      setHydrationStatus(`+${credits}`);
      setHydrationInput('1');
      setTimeout(() => setHydrationStatus(''), 1800);
    } catch {
      setHydrationStatus('Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header style={{ background: '#05111f' }}>
      {/* Top row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#2d4a66' }}>
            {playerProfile?.username || 'FormFlow'}
          </p>
          <h1 className="text-lg font-bold tracking-tight leading-none" style={{ color: '#f0f6ff' }}>
            FORMFLOW
          </h1>
        </div>

        {/* Stats row */}
        <div className="flex items-stretch divide-x" style={{ borderColor: '#1a2e45', border: '1px solid #1a2e45' }}>
          {/* Score */}
          <div className="flex flex-col items-center px-4 py-2" style={{ minWidth: 64 }}>
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#2d4a66' }}>Score</span>
            <motion.span
              key={playerScore}
              initial={{ color: '#00f2fe' }}
              animate={{ color: '#f0f6ff' }}
              transition={{ duration: 0.5 }}
              className="text-sm font-bold"
            >
              {playerScore}
            </motion.span>
          </div>

          {/* Combo */}
          <div className="flex flex-col items-center px-4 py-2" style={{ minWidth: 56 }}>
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#2d4a66' }}>Combo</span>
            <motion.span
              key={combo}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="text-sm font-bold"
              style={{ color: combo > 0 ? '#00f2fe' : '#5a7a9a' }}
            >
              ×{combo}
            </motion.span>
          </div>

          {/* Hydration */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowForm(v => !v)}
              className="flex flex-col items-center px-4 py-2 h-full"
              style={{ minWidth: 64 }}
            >
              <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#2d4a66' }}>H₂O</span>
              <span className="text-sm font-bold" style={{ color: '#f0f6ff' }}>
                {hydrationStatus || (playerProfile?.hydrationCredits ?? '--')}
              </span>
            </button>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-50 p-3"
                  style={{ background: '#0b1929', border: '1px solid #1a2e45', width: 140 }}
                >
                  <p className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: '#2d4a66' }}>Add Credits</p>
                  <form onSubmit={handleHydrationSubmit} className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={hydrationInput}
                      onChange={e => setHydrationInput(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm font-medium"
                      style={{ background: '#05111f', border: '1px solid #1a2e45', color: '#f0f6ff', fontSize: 16, borderRadius: 0, outline: 'none', width: 52 }}
                      aria-label="Credits to add"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-xs font-bold"
                      style={{ background: '#00f2fe', color: '#05111f', border: 'none', borderRadius: 0, cursor: 'pointer' }}
                    >
                      {isSubmitting ? '…' : '+'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom meta row */}
      <div className="flex items-center gap-3 px-4 pb-2">
        <span
          className="text-[9px] font-bold tracking-widest uppercase px-2 py-1"
          style={{ background: '#0b1929', border: '1px solid #1a2e45', color: '#f0f6ff' }}
        >
          {selectedLevel === 'pro' ? 'Pro' : 'Beginner'}
        </span>
        <span
          className="flex items-center gap-1.5 text-[9px] font-bold tracking-wide uppercase"
          style={{ color: isWipeoutActive ? '#ff4d6d' : status.color }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: isWipeoutActive ? '#ff4d6d' : status.color,
              boxShadow: realtimeStatus === 'connected' && !isWipeoutActive ? '0 0 4px #00f2fe' : 'none',
            }}
          />
          {isWipeoutActive ? 'Wipeout' : status.label}
        </span>
      </div>
    </header>
  );
};

export default Header;
