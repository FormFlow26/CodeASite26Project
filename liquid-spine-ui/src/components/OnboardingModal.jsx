import React from 'react';
import { motion } from 'framer-motion';

const LEVELS = [
  {
    id: 'beginner',
    label: 'Beginner',
    tag: 'Recommended',
    desc: 'Guided form coaching with calmer feedback pacing. Best for athletes new to AI-assisted training.',
    accent: '#00f2fe',
  },
  {
    id: 'pro',
    label: 'Pro',
    tag: 'Advanced',
    desc: 'Faster feedback, competitive scoring, and unfiltered kink detection for seasoned lifters.',
    accent: '#6366f1',
  },
];

const cardVariants = {
  initial: { opacity: 0, y: 24 },
  animate: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

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
      <div className="flex flex-col h-full" style={{ background: '#05111f' }}>
        <div className="flex-1 px-5 pt-6 pb-4">
          {onBack && (
            <button type="button" className="page-back-button mb-5" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          )}

          <p className="text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: '#2d4a66' }}>Home Base</p>
          <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#f0f6ff' }}>Welcome back.</h2>
          <p className="text-sm mb-6" style={{ color: '#5a7a9a' }}>Pick up where you left off.</p>

          {/* Level selector */}
          <p className="text-[9px] font-bold tracking-widest uppercase mb-2" style={{ color: '#2d4a66' }}>Current Level</p>
          <div className="flex mb-6" style={{ border: '1px solid #1a2e45' }}>
            {['beginner', 'pro'].map((lvl, i) => (
              <motion.button
                key={lvl}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectLevel(lvl)}
                className="flex-1 py-3 text-xs font-bold tracking-wide uppercase"
                style={{
                  background: selectedLevel === lvl ? '#00f2fe' : '#0b1929',
                  color: selectedLevel === lvl ? '#05111f' : '#5a7a9a',
                  border: 'none',
                  borderRight: i === 0 ? '1px solid #1a2e45' : 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                }}
              >
                {lvl}
              </motion.button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1a2e45' }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onGoToGym}
            className="w-full py-4 text-sm font-bold tracking-widest uppercase"
            style={{ background: '#00f2fe', color: '#05111f', border: 'none', borderRadius: 0, cursor: 'pointer' }}
          >
            Go to Gym →
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={onGoToSocial}
            className="w-full py-4 text-sm font-semibold"
            style={{ background: '#0b1929', color: '#5a7a9a', border: 'none', borderTop: '1px solid #1a2e45', borderRadius: 0, cursor: 'pointer' }}
          >
            Open Social Hub
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#05111f' }}>
      <div className="flex-1 px-5 pt-6 overflow-y-auto">
        {onBack && (
          <button type="button" className="page-back-button mb-5" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: '#2d4a66' }}>Getting Started</p>
          <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: '#f0f6ff' }}>Choose your level.</h2>
          <p className="text-sm mb-8" style={{ color: '#5a7a9a' }}>
            Sets your feedback speed and scoring sensitivity. Change it anytime from Home.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3 mb-8">
          {LEVELS.map((lvl, i) => (
            <motion.button
              key={lvl.id}
              type="button"
              custom={i}
              variants={cardVariants}
              initial="initial"
              animate="animate"
              whileTap={{ scale: 0.98 }}
              onClick={() => onComplete(lvl.id)}
              className="w-full text-left p-5"
              style={{
                background: '#0b1929',
                border: '1px solid #1a2e45',
                borderLeft: `3px solid ${lvl.accent}`,
                borderRadius: 0,
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold" style={{ color: '#f0f6ff' }}>{lvl.label}</span>
                <span
                  className="text-[9px] font-bold tracking-widest uppercase px-2 py-1"
                  style={{ background: '#05111f', border: `1px solid ${lvl.accent}`, color: lvl.accent, borderRadius: 0 }}
                >
                  {lvl.tag}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#5a7a9a' }}>{lvl.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1a2e45' }}>
        <button
          type="button"
          onClick={onGoToGym}
          className="w-full py-4 text-xs font-semibold"
          style={{ background: 'none', border: 'none', color: '#2d4a66', cursor: 'pointer' }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default OnboardingModal;
