import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import OnboardingModal from './components/OnboardingModal';
import GymTab from './components/GymTab';
import SocialTab from './components/SocialTab';

const ONBOARDING_STORAGE_KEY = 'formflow-has-onboarded';
const ACTIVE_TAB_STORAGE_KEY = 'formflow-active-tab';
const LEVEL_STORAGE_KEY = 'formflow-level';
const VALID_TABS = ['home', 'main', 'social'];
const VALID_LEVELS = ['beginner', 'pro'];

function App() {
  const [playerScore, setPlayerScore] = useState(1250);
  const [combo, setCombo] = useState(3);
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') {
      return hasOnboarded ? 'main' : 'home';
    }

    const storedTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);

    if (storedTab && VALID_TABS.includes(storedTab)) {
      return storedTab;
    }

    return hasOnboarded ? 'main' : 'home';
  });
  const [selectedLevel, setSelectedLevel] = useState(() => {
    if (typeof window === 'undefined') {
      return 'beginner';
    }

    const storedLevel = window.localStorage.getItem(LEVEL_STORAGE_KEY);

    if (storedLevel && VALID_LEVELS.includes(storedLevel)) {
      return storedLevel;
    }

    return 'beginner';
  });

  useEffect(() => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, String(hasOnboarded));
  }, [hasOnboarded]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    window.localStorage.setItem(LEVEL_STORAGE_KEY, selectedLevel);
  }, [selectedLevel]);

  const handleSuccessfulRep = () => {
    setPlayerScore((currentScore) => currentScore + 75);
    setCombo((currentCombo) => Math.min(currentCombo + 1, 99));
  };

  const handleRejectedRep = () => {
    setCombo(0);
  };

  const handleCompleteOnboarding = (level = 'beginner') => {
    setSelectedLevel(level);
    setHasOnboarded(true);
    setActiveTab('main');
  };

  return (
    <div className="app-shell">
      <Header
        playerScore={playerScore}
        combo={combo}
        selectedLevel={selectedLevel}
      />

      <div className="app-content">
        {activeTab === 'home' && (
          <OnboardingModal
            hasOnboarded={hasOnboarded}
            selectedLevel={selectedLevel}
            onComplete={handleCompleteOnboarding}
            onSelectLevel={setSelectedLevel}
            onGoToGym={() => setActiveTab('main')}
            onGoToSocial={() => setActiveTab('social')}
          />
        )}
        {activeTab === 'main' && (
          <GymTab
            onSuccessfulRep={handleSuccessfulRep}
            onRejectedRep={handleRejectedRep}
          />
        )}
        {activeTab === 'social' && <SocialTab />}
      </div>

      <div className="app-bottom-dock">
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

export default App;
