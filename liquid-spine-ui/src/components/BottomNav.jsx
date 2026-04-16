import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7.5 18V12.5h5V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'main',
    label: 'Gym',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 10h2M15 10h2M10 3v2M10 15v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M1 9h2a1 1 0 011 1v0a1 1 0 01-1 1H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M19 9h-2a1 1 0 00-1 1v0a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'social',
    label: 'Social',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 17c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M17 17c0-2.5-1.5-4-3-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const BottomNav = ({ activeTab, setActiveTab }) => {
  return (
    <nav
      className="flex items-center gap-1 px-2 py-2 rounded-2xl"
      style={{
        background: 'rgba(13, 31, 53, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3)',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={isActive}
            className="relative flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors duration-200"
            style={{ color: isActive ? '#f0f6ff' : '#3d5a80' }}
          >
            {/* Active background pill */}
            {isActive && (
              <motion.div
                layoutId="nav-active-bg"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'rgba(0, 242, 254, 0.1)',
                  border: '1px solid rgba(0, 242, 254, 0.15)',
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              />
            )}

            {/* Icon */}
            <span
              className="relative z-10 transition-colors duration-200"
              style={{ color: isActive ? '#00f2fe' : '#3d5a80' }}
            >
              {tab.icon}
            </span>

            {/* Label */}
            <span
              className="relative z-10 text-[9px] font-bold tracking-wider uppercase"
              style={{ color: isActive ? '#f0f6ff' : '#3d5a80' }}
            >
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
