import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startFormFlow } from '../formflow/startFormFlow.js';
import { getRuntimeConfig } from '../lib/formflowApi';

const MUSCLE_PRESETS = {
  Quads: { fill: 30, goal: '4 × 12', tips: 'Keep heels planted.' },
  Chest: { fill: 10, goal: '3 × 10', tips: 'Slow eccentric movement.' },
  Back: { fill: 0, goal: '5 × 8', tips: 'Pull with your elbows.' },
};

const MUSCLE_TO_EXERCISE = {
  Quads: 'squat',
  Chest: 'bench',
  Back: 'deadlift',
};

const INITIAL_FEEDBACK = {
  tone: 'info',
  text: 'Choose a focus area and start the form check when you are ready.',
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const GymTab = ({
  onSuccessfulRep,
  onRejectedRep,
  wipeoutEvent,
  replaySession,
  replayStatus,
  replayError,
  isWipeoutActive,
  currentUserId,
  currentGroupId,
}) => {
  const [activeMuscle, setActiveMuscle] = useState('Quads');
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [feedback, setFeedback] = useState(INITIAL_FEEDBACK);
  const [muscleData] = useState(MUSCLE_PRESETS);
  const [lastRepFluidity, setLastRepFluidity] = useState(null);
  const [lastRepFlags, setLastRepFlags] = useState([]);
  const videoRef = useRef(null);
  const formflowRef = useRef(null);

  const { userId, groupId, socketUrl } = getRuntimeConfig();
  const resolvedUserId = currentUserId || userId;
  const resolvedGroupId = currentGroupId || groupId;
  const hasTracking = Boolean(resolvedUserId);
  const isCameraReady = cameraStatus === 'ready';
  const isRequestingCamera = cameraStatus === 'requesting';
  const activeMuscleData = muscleData[activeMuscle];
  const displayedFill = isCameraReady
    ? clamp(Math.round(lastRepFluidity ?? activeMuscleData.fill), 0, 100)
    : activeMuscleData.fill;
  const liveKinkCount = wipeoutEvent?.totalKinks ?? wipeoutEvent?.kinkSnapshots?.length ?? 0;

  const stopCamera = () => {
    formflowRef.current?.stop();
    formflowRef.current = null;
    setCameraStatus('idle');
    setLastRepFluidity(null);
    setLastRepFlags([]);
    setFeedback(INITIAL_FEEDBACK);
  };

  useEffect(() => {
    return () => { formflowRef.current?.stop(); };
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraError('Camera not supported in this browser.');
      setFeedback({ tone: 'warning', text: 'Form check unavailable here, but you can still explore the prototype.' });
      return;
    }

    setCameraError('');
    setLastRepFluidity(null);
    setLastRepFlags([]);
    setFeedback({ tone: 'info', text: 'Loading MediaPipe and requesting camera access...' });
    setCameraStatus('requesting');

    try {
      const exerciseType = MUSCLE_TO_EXERCISE[activeMuscle] || 'squat';
      formflowRef.current = await startFormFlow({
        videoElement: videoRef.current,
        userId: resolvedUserId,
        groupId: resolvedGroupId,
        exerciseType,
        serverUrl: socketUrl,
        onSystemError: ({ message }) => {
          setFeedback({ tone: 'warning', text: message || 'Live sync unavailable, local tracking active.' });
        },
        onRepComplete: ({ kinkDetected, fluidityScore, flags }) => {
          setLastRepFluidity(fluidityScore);
          setLastRepFlags(flags || []);
          if (kinkDetected) {
            onRejectedRep?.();
            setFeedback({ tone: 'warning', text: `Rep flagged. Fluidity ${Math.round(fluidityScore ?? 0)}%. Adjust posture.` });
          } else {
            onSuccessfulRep?.(activeMuscle);
            setFeedback({ tone: 'success', text: `Clean rep. Fluidity ${Math.round(fluidityScore ?? 0)}%.` });
          }
        },
      });
      setCameraStatus('ready');
      setFeedback({ tone: 'info', text: 'MediaPipe live. Complete one full rep to score your form.' });
    } catch (error) {
      setCameraStatus('error');
      formflowRef.current = null;
      setCameraError(
        error?.name === 'NotAllowedError' ? 'Camera permission denied.' : error?.message || 'Camera could not start.',
      );
      setFeedback({
        tone: 'warning',
        text: error?.name === 'NotAllowedError'
          ? 'Permission denied. Retry when ready.'
          : error?.message || 'Problem starting camera. Try again.',
      });
    }
  };

  const feedbackColor = feedback.tone === 'success' ? '#00f2fe' : feedback.tone === 'warning' ? '#ff4d6d' : '#5a7a9a';

  return (
    <div className="gym-shell">

      {/* Muscle selector strip */}
      <div className="muscle-strip">
        {Object.keys(muscleData).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setActiveMuscle(name)}
            className={`muscle-tab${activeMuscle === name ? ' is-active' : ''}`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Camera hero — fills remaining space */}
      <div className="camera-hero">
        {/* Video element — always mounted, hidden when not ready */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: isCameraReady ? 'block' : 'none' }}
        />

        {/* Idle / requesting / error placeholder */}
        {!isCameraReady && (
          <div className="camera-idle-placeholder">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.3 }}>
              <rect x="2" y="8" width="20" height="16" rx="2" stroke="#f0f6ff" strokeWidth="1.5"/>
              <path d="M22 13l8-4v14l-8-4V13z" stroke="#f0f6ff" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#2d4a66' }}>
              {isRequestingCamera ? 'Starting camera...' : cameraError || 'Camera off'}
            </p>
          </div>
        )}

        {/* Bottom overlay: fluidity bar + feedback */}
        <div className="camera-overlay">
          <div className="fluidity-bar-track">
            <div className="fluidity-bar-fill" style={{ width: `${displayedFill}%` }} />
          </div>
          <div className="camera-overlay-text">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: feedbackColor }}>
              {feedback.text}
            </span>
            <span className="text-[10px] font-bold tracking-widest" style={{ color: '#2d4a66' }}>
              {displayedFill}%
            </span>
          </div>
          {lastRepFlags.length > 0 && (
            <p className="text-[9px] mt-1" style={{ color: '#ff4d6d' }}>
              Flags: {lastRepFlags.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="gym-info-row">
        <div className="gym-info-cell">
          <p className="gym-info-label">Focus</p>
          <p className="gym-info-value">{activeMuscle} · {activeMuscleData.goal}</p>
        </div>
        <div className="gym-info-cell">
          <p className="gym-info-label">Coach cue</p>
          <p className="gym-info-value">{activeMuscleData.tips}</p>
        </div>
        <div className="gym-info-cell">
          <p className="gym-info-label">Status</p>
          <p className="gym-info-value" style={{ color: isCameraReady ? '#00f2fe' : '#5a7a9a' }}>
            {isCameraReady ? 'Tracking live' : 'Standby'}
          </p>
        </div>
      </div>

      {/* Wipeout stat strip — shown when alert received */}
      <AnimatePresence>
        {wipeoutEvent && (
          <motion.div
            className="gym-stat-strip"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {[
              { label: 'Kinks', value: liveKinkCount },
              { label: 'Avg fluidity', value: `${Math.round(wipeoutEvent.averageFluidity ?? 0)}%` },
              { label: 'Max fluidity', value: `${Math.round(wipeoutEvent.maxFluidity ?? 0)}%` },
              { label: 'Exercise', value: wipeoutEvent.exerciseType || '—' },
            ].map((stat) => (
              <div key={stat.label} className="gym-stat-cell">
                <p className="gym-info-label">{stat.label}</p>
                <p className="gym-info-value" style={{ color: '#ff4d6d' }}>{stat.value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA button */}
      {isCameraReady ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={stopCamera}
          className="gym-cta is-stop"
        >
          Stop Camera
        </motion.button>
      ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={startCamera}
          disabled={isRequestingCamera || !hasTracking}
          className="gym-cta"
        >
          {isRequestingCamera ? 'Starting...' : !hasTracking ? 'Log in to track' : `Start Form Check — ${activeMuscle}`}
          {!isRequestingCamera && hasTracking && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 4 }}>
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </motion.button>
      )}
    </div>
  );
};

export default GymTab;
