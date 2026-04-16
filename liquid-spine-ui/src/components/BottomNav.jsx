import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M2 8.5L9 2l7 6.5V16a.5.5 0 01-.5.5H12v-4.5H6V16.5H2.5A.5.5 0 012 16V8.5z"
          stroke={active ? '#00f2fe' : '#2d4a66'} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'main',
    label: 'Gym',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="2.5" stroke={active ? '#00f2fe' : '#2d4a66'} strokeWidth="1.5"/>
        <path d="M1 8.5h2.5M14.5 8.5H17M1 8.5h1a1 1 0 011 1v0a1 1 0 01-1 1H1M17 8.5h-1a1 1 0 00-1 1v0a1 1 0 001 1h1"
          stroke={active ? '#00f2fe' : '#2d4a66'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'social',
    label: 'Social',
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="6.5" cy="7" r="2.5" stroke={active ? '#00f2fe' : '#2d4a66'} strokeWidth="1.5"/>
        <path d="M1 16c0-3 2.5-4.5 5.5-4.5S12 13 12 16" stroke={active ? '#00f2fe' : '#2d4a66'} strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="13" cy="6" r="2" stroke={active ? '#00f2fe' : '#2d4a66'} strokeWidth="1.5"/>
        <path d="M15.5 15.5c0-2-1.2-3.5-2.5-4" stroke={active ? '#00f2fe' : '#2d4a66'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const BottomNav = ({ activeTab, setActiveTab }) => (
  <nav className="flex" style={{ background: '#05111f' }}>
    {TABS.map((tab) => {
      const active = activeTab === tab.id;
      return (
        <motion.button
          key={tab.id}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => setActiveTab(tab.id)}
          aria-pressed={active}
          className="flex-1 flex flex-col items-center gap-1 py-3"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {tab.icon(active)}
          <span
            className="text-[9px] font-bold tracking-widest uppercase"
            style={{ color: active ? '#00f2fe' : '#2d4a66' }}
          >
            {tab.label}
          </span>
        </motion.button>
      );
    })}
  </nav>
);

export default BottomNav;
