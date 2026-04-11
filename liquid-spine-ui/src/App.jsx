import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
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

const ONBOARDING_STORAGE_KEY = 'formflow-has-onboarded';
const ACTIVE_TAB_STORAGE_KEY = 'formflow-active-tab';
const LEVEL_STORAGE_KEY = 'formflow-level';
const VALID_TABS = ['home', 'main', 'social'];
const VALID_LEVELS = ['beginner', 'pro'];
const runtimeConfig = getRuntimeConfig();

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
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let connection;

    async function attachRealtimeFeed() {
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
  }, []);

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
        {profileError && (
          <div className="main-content">
            <div className="status-banner" data-tone="warning">
              Live profile could not be loaded: {profileError}
            </div>
          </div>
        )}

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
            wipeoutEvent={wipeoutEvent}
            replaySession={replaySession}
            replayStatus={replayStatus}
            replayError={replayError}
            isWipeoutActive={isWipeoutActive}
          />
        )}
        {activeTab === 'social' && (
          <SocialTab
            playerProfile={playerProfile}
            currentUserId={playerProfile?._id || runtimeConfig.userId}
            realtimeStatus={realtimeStatus}
          />
        )}
      </div>

      <div className="app-bottom-dock">
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

export default App;
