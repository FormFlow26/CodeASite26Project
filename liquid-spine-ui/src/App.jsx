import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LandingPage from './components/LandingPage';
import LoginGate from './components/LoginGate';
import OnboardingModal from './components/OnboardingModal';
import GymTab from './components/GymTab';
import SocialTab from './components/SocialTab';
import {
  connectToRealtimeFeed,
  getRuntimeConfig,
  getSessionReplay,
  getUserProfile,
  playWipeoutAlertTone,
} from './lib/formflowApi';

const ONBOARDING_STORAGE_KEY = 'formflow-has-onboarded-v2';
const ACTIVE_TAB_STORAGE_KEY = 'formflow-active-tab';
const LEVEL_STORAGE_KEY = 'formflow-level';
const VALID_TABS = ['home', 'main', 'social'];
const VALID_LEVELS = ['beginner', 'pro'];
const runtimeConfig = getRuntimeConfig();

function sameView(firstView, secondView) {
  return (
    firstView?.screen === secondView?.screen
    && firstView?.tab === secondView?.tab
    && firstView?.mode === secondView?.mode
    && firstView?.onboarded === secondView?.onboarded
  );
}

function renderAppSurface(content, toneClass = '') {
  return (
    <div className={`mobile-scene ${toneClass}`.trim()}>
      <div className="mobile-surface">
        {content}
      </div>
    </div>
  );
}

function App() {
  const [playerScore, setPlayerScore] = useState(1250);
  const [combo, setCombo] = useState(3);
  const [authMode, setAuthMode] = useState('login');
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  const [navHistory, setNavHistory] = useState([]);
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
  const [playerProfile, setPlayerProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [wipeoutEvent, setWipeoutEvent] = useState(null);
  const [replaySession, setReplaySession] = useState(null);
  const [replayStatus, setReplayStatus] = useState('idle');
  const [replayError, setReplayError] = useState('');
  const [isWipeoutActive, setIsWipeoutActive] = useState(false);
  const lastEventSignatureRef = useRef('');
  const wipeoutTimerRef = useRef(null);

  const getCurrentView = () => {
    if (!showLoginGate) {
      return { screen: 'landing' };
    }

    if (!hasEnteredApp) {
      return { screen: 'login', mode: authMode };
    }

    return {
      screen: 'app',
      tab: activeTab,
      onboarded: hasOnboarded,
    };
  };

  const restoreView = (view) => {
    if (!view) {
      return;
    }

    if (view.screen === 'landing') {
      setShowLoginGate(false);
      setHasEnteredApp(false);
      return;
    }

    if (view.screen === 'login') {
      setShowLoginGate(true);
      setHasEnteredApp(false);
      setAuthMode(view.mode || 'login');
      return;
    }

    setShowLoginGate(true);
    setHasEnteredApp(true);
    setActiveTab(view.tab || 'home');

    if (typeof view.onboarded === 'boolean') {
      setHasOnboarded(view.onboarded);
    }
  };

  const pushCurrentView = () => {
    const currentView = getCurrentView();

    setNavHistory((currentHistory) => {
      const lastView = currentHistory[currentHistory.length - 1];

      if (sameView(lastView, currentView)) {
        return currentHistory;
      }

      return [...currentHistory, currentView];
    });
  };

  useEffect(() => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, String(hasOnboarded));
  }, [hasOnboarded]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    window.localStorage.setItem(LEVEL_STORAGE_KEY, selectedLevel);
  }, [selectedLevel]);

  useEffect(() => {
    let isCancelled = false;

    async function loadProfile() {
      if (!hasEnteredApp) {
        setPlayerProfile(null);
        setProfileError('');
        return;
      }

      if (!runtimeConfig.userId) {
        setPlayerProfile(null);
        setProfileError('');
        return;
      }

      try {
        const profile = await getUserProfile(runtimeConfig.userId);
        if (!isCancelled) {
          setPlayerProfile(profile);
          setProfileError('');
        }
      } catch (error) {
        if (!isCancelled) {
          setPlayerProfile(null);
          setProfileError(error.message);
        }
      }
    }

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [hasEnteredApp]);

  useEffect(() => {
    let isCancelled = false;
    let connection;

    async function attachRealtimeFeed() {
      if (!hasEnteredApp) {
        setRealtimeStatus('connecting');
        return;
      }

      try {
        connection = await connectToRealtimeFeed({
          socketUrl: runtimeConfig.socketUrl,
          groupId: runtimeConfig.groupId,
          onStatusChange: (status) => {
            if (!isCancelled) {
              setRealtimeStatus(status);
            }
          },
          onWipeout: async (event) => {
            if (isCancelled) {
              return;
            }

            const signature = [
              event.sessionId,
              event.totalKinks,
              event.maxFluidity,
              event.kinkSnapshots?.length,
            ].join(':');

            if (lastEventSignatureRef.current === signature) {
              return;
            }

            lastEventSignatureRef.current = signature;
            setWipeoutEvent(event);
            setReplayError('');
            setReplayStatus('loading');
            setIsWipeoutActive(true);
            setCombo(0);
            setActiveTab('main');
            playWipeoutAlertTone();

            if (wipeoutTimerRef.current) {
              window.clearTimeout(wipeoutTimerRef.current);
            }

            wipeoutTimerRef.current = window.setTimeout(() => {
              setIsWipeoutActive(false);
            }, 4200);

            try {
              const replay = await getSessionReplay(event.sessionId);
              if (!isCancelled) {
                setReplaySession(replay);
                setReplayStatus('ready');
              }
            } catch (error) {
              if (!isCancelled) {
                setReplayStatus('error');
                setReplayError(error.message);
              }
            }
          },
        });
      } catch {
        if (!isCancelled) {
          setRealtimeStatus('error');
        }
      }
    }

    attachRealtimeFeed();

    return () => {
      isCancelled = true;
      connection?.disconnect();

      if (wipeoutTimerRef.current) {
        window.clearTimeout(wipeoutTimerRef.current);
      }
    };
  }, [hasEnteredApp]);

  const handleSuccessfulRep = () => {
    setPlayerScore((currentScore) => currentScore + 75);
    setCombo((currentCombo) => Math.min(currentCombo + 1, 99));
  };

  const handleRejectedRep = () => {
    setCombo(0);
  };

  const handleCompleteOnboarding = (level = 'beginner') => {
    pushCurrentView();
    setSelectedLevel(level);
    setHasOnboarded(true);
    setActiveTab('main');
  };

  const handleLogin = () => {
    pushCurrentView();
    setHasEnteredApp(true);
    setActiveTab(hasOnboarded ? 'home' : 'home');
  };

  const handleOpenAuth = (mode = 'login') => {
    pushCurrentView();
    setAuthMode(mode);
    setShowLoginGate(true);
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) {
      return;
    }

    pushCurrentView();
    setActiveTab(nextTab);
  };

  const handleBack = () => {
    setNavHistory((currentHistory) => {
      const previousView = currentHistory[currentHistory.length - 1];

      if (!previousView) {
        return currentHistory;
      }

      restoreView(previousView);
      return currentHistory.slice(0, -1);
    });
  };

  const canGoBack = navHistory.length > 0;

  if (!showLoginGate) {
    return renderAppSurface(<LandingPage onStart={handleOpenAuth} />, 'mobile-scene-landing');
  }

  if (!hasEnteredApp) {
    return renderAppSurface(
      <LoginGate
        authMode={authMode}
        onLogin={handleLogin}
        onSwitchMode={setAuthMode}
        onBack={canGoBack ? handleBack : null}
      />,
      'mobile-scene-login',
    );
  }

  return renderAppSurface(
    <div className={`app-shell ${isWipeoutActive ? 'is-wipeout-active' : ''}`}>
      <Header
        playerScore={playerScore}
        combo={combo}
        selectedLevel={selectedLevel}
        playerProfile={playerProfile}
        realtimeStatus={realtimeStatus}
        isWipeoutActive={isWipeoutActive}
      />

      <div className="app-content">
        {canGoBack && activeTab !== 'home' && (
          <div className="main-content page-toolbar-shell page-transition">
            <button type="button" className="page-back-button" onClick={handleBack}>
              ← Back
            </button>
          </div>
        )}

        {profileError && (
          <div className="main-content">
            <div className="status-banner" data-tone="warning">
              Live profile could not be loaded: {profileError}
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div key={`screen-home-${hasOnboarded ? 'ready' : 'onboarding'}`} className="page-transition">
            <OnboardingModal
              hasOnboarded={hasOnboarded}
              selectedLevel={selectedLevel}
              onComplete={handleCompleteOnboarding}
              onSelectLevel={setSelectedLevel}
              onGoToGym={() => handleTabChange('main')}
              onGoToSocial={() => handleTabChange('social')}
              onBack={canGoBack ? handleBack : null}
            />
          </div>
        )}
        {activeTab === 'main' && (
          <div key="screen-main" className="page-transition">
            <GymTab
              onSuccessfulRep={handleSuccessfulRep}
              onRejectedRep={handleRejectedRep}
              wipeoutEvent={wipeoutEvent}
              replaySession={replaySession}
              replayStatus={replayStatus}
              replayError={replayError}
              isWipeoutActive={isWipeoutActive}
            />
          </div>
        )}
        {activeTab === 'social' && (
          <div key="screen-social" className="page-transition">
            <SocialTab
              playerProfile={playerProfile}
              currentUserId={playerProfile?._id || runtimeConfig.userId}
              realtimeStatus={realtimeStatus}
            />
          </div>
        )}
      </div>

      <div className="app-bottom-dock">
        <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
      </div>
    </div>,
    'mobile-scene-app',
  );
}

export default App;
