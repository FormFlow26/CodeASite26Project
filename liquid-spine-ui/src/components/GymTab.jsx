import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReplayChart from './ReplayChart';
import { startFormFlow } from '../formflow/startFormFlow.js';
import { getRuntimeConfig } from '../lib/formflowApi';
import tankBodyReference from '../assets/tank-body-reference.png';

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

const StatusBanner = ({ tone, children }) => {
  const styles = {
    info: { bg: 'rgba(0, 242, 254, 0.06)', border: 'rgba(0,242,254,0.15)', color: '#7a9bbf' },
    success: { bg: 'rgba(0, 242, 254, 0.1)', border: 'rgba(0,242,254,0.25)', color: '#00f2fe' },
    warning: { bg: 'rgba(255, 77, 109, 0.08)', border: 'rgba(255,77,109,0.2)', color: '#ff4d6d' },
  };
  const s = styles[tone] || styles.info;
  return (
    <div
      className="px-4 py-3 rounded-xl text-sm leading-snug"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      {children}
    </div>
  );
};

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
  const liveWipeoutMessage = wipeoutEvent
    ? `${wipeoutEvent.exerciseType || 'Workout'} wipeout — ${liveKinkCount} posture breaks flagged.`
    : null;

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
      setCameraError('Camera access is not supported in this browser.');
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

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Muscle selector */}
      <div className="flex gap-2">
        {Object.keys(muscleData).map((name) => (
          <motion.button
            key={name}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveMuscle(name)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200"
            style={{
              background: activeMuscle === name ? 'rgba(0, 242, 254, 0.12)' : 'rgba(13, 31, 53, 0.6)',
              border: `1px solid ${activeMuscle === name ? 'rgba(0,242,254,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: activeMuscle === name ? '#00f2fe' : '#7a9bbf',
            }}
          >
            {name}
          </motion.button>
        ))}
      </div>

      {/* Main camera + gauge card */}
      <Card>
        {/* Card header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#f0f6ff' }}>{activeMuscle}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#3d5a80' }}>Live form tracking</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-widest block" style={{ color: '#3d5a80' }}>Goal</span>
            <span className="text-sm font-bold" style={{ color: '#f0f6ff' }}>{activeMuscleData.goal}</span>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'Coach Cue', value: activeMuscleData.tips },
            { label: 'Status', value: isCameraReady ? 'Tracking live' : 'Standby' },
          ].map((item) => (
            <div
              key={item.label}
              className="px-3 py-2 rounded-xl"
              style={{ background: 'rgba(5, 17, 31, 0.5)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest block mb-0.5" style={{ color: '#3d5a80' }}>{item.label}</span>
              <span className="text-xs font-medium" style={{ color: '#7a9bbf' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Camera stage */}
        <div className="camera-stage">
          <div
            className="water-container"
            style={{ transform: isCameraReady ? 'scale(0.8)' : 'scale(1)' }}
          >
            <div className="tank-muscle-badge">{activeMuscle}</div>
            <div className={`tank-muscle-graphic tank-muscle-graphic--${activeMuscle.toLowerCase()}`}>
              <img
                src={tankBodyReference}
                alt=""
                className="tank-body-reference"
                aria-hidden="true"
              />
              <div className="tank-muscle-overlay">
                <span className="tank-highlight tank-highlight-chest" />
                <span className="tank-highlight tank-highlight-back" />
                <span className="tank-highlight tank-highlight-quad-left" />
                <span className="tank-highlight tank-highlight-quad-right" />
              </div>
            </div>
            <div className="water-fill" style={{ height: `${displayedFill}%` }} />
            <div className="water-level-label">{displayedFill}%</div>
          </div>

          <div className="camera-shell" style={{ display: isCameraReady ? 'block' : 'none' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '160px',
                height: '220px',
                objectFit: 'cover',
                borderRadius: '12px',
                border: '2px solid rgba(0, 242, 254, 0.3)',
                boxShadow: '0 0 20px rgba(0, 242, 254, 0.1)',
              }}
            />
          </div>
        </div>

        {/* Status messages */}
        <div className="flex flex-col gap-2 mt-4">
          <AnimatePresence>
            {liveWipeoutMessage && (
              <motion.div key="wipeout" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <StatusBanner tone="warning">{liveWipeoutMessage}</StatusBanner>
              </motion.div>
            )}
            {cameraError && (
              <motion.div key="cam-error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <StatusBanner tone="warning">{cameraError}</StatusBanner>
              </motion.div>
            )}
            {!hasTracking && (
              <motion.div key="no-tracking" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <StatusBanner tone="warning">Log in to enable live tracking and scoring.</StatusBanner>
              </motion.div>
            )}
          </AnimatePresence>
          <StatusBanner tone={feedback.tone}>{feedback.text}</StatusBanner>
          {isCameraReady && lastRepFluidity !== null && (
            <StatusBanner tone="info">Last rep quality: {Math.round(lastRepFluidity)}%</StatusBanner>
          )}
          {isCameraReady && lastRepFlags.length > 0 && (
            <StatusBanner tone="warning">Flags: {lastRepFlags.join(', ')}</StatusBanner>
          )}
        </div>

        {/* Action */}
        <div className="mt-4">
          {isCameraReady ? (
            <div className="flex flex-col gap-2">
              <StatusBanner tone="info">Automatic rep detection active. Move through the exercise to score reps.</StatusBanner>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={stopCamera}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#7a9bbf',
                }}
              >
                Stop Camera
              </motion.button>
            </div>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={startCamera}
              disabled={isRequestingCamera || !hasTracking}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isRequestingCamera
                  ? 'rgba(0,242,254,0.2)'
                  : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                color: '#05111f',
                boxShadow: isRequestingCamera ? 'none' : '0 8px 24px rgba(0, 242, 254, 0.2)',
              }}
            >
              {isRequestingCamera ? 'Requesting camera...' : 'Start Form Check'}
            </motion.button>
          )}
        </div>
      </Card>

      {/* Live session card */}
      <Card
        style={{
          background: 'rgba(13, 31, 53, 0.7)',
          border: isWipeoutActive ? '1px solid rgba(255, 77, 109, 0.3)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: isWipeoutActive ? '0 0 30px rgba(255, 77, 109, 0.12)' : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#f0f6ff' }}>Current Session</h3>
            <p className="text-xs mt-0.5" style={{ color: '#3d5a80' }}>Live coaching alerts</p>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{
              background: wipeoutEvent ? 'rgba(255,77,109,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${wipeoutEvent ? 'rgba(255,77,109,0.2)' : 'rgba(255,255,255,0.06)'}`,
              color: wipeoutEvent ? '#ff4d6d' : '#3d5a80',
            }}
          >
            {wipeoutEvent ? 'Alert' : 'Standby'}
          </span>
        </div>

        {wipeoutEvent ? (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total kinks', value: liveKinkCount },
              { label: 'Avg fluidity', value: Math.round(wipeoutEvent.averageFluidity ?? 0) },
              { label: 'Max fluidity', value: Math.round(wipeoutEvent.maxFluidity ?? 0) },
              { label: 'Exercise', value: wipeoutEvent.exerciseType || 'Unknown' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(5,17,31,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="text-[10px] uppercase tracking-widest block mb-0.5" style={{ color: '#3d5a80' }}>{stat.label}</span>
                <span className="text-base font-bold" style={{ color: '#f0f6ff' }}>{stat.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <StatusBanner tone="info">No coaching alerts yet. Flagged reps will appear here instantly.</StatusBanner>
        )}
      </Card>

      {/* Replay card */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: '#f0f6ff' }}>Post-Workout Analysis</h3>
            <p className="text-xs mt-0.5" style={{ color: '#3d5a80' }}>Fluidity over time</p>
          </div>
        </div>

        {replayStatus === 'idle' && (
          <StatusBanner tone="info">Waiting for replay data from the latest flagged set.</StatusBanner>
        )}
        {replayStatus === 'loading' && (
          <div className="flex gap-2 items-center py-3">
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(0,242,254,0.3)', borderTopColor: '#00f2fe' }} />
            <span className="text-xs" style={{ color: '#7a9bbf' }}>Loading replay...</span>
          </div>
        )}
        {replayStatus === 'error' && (
          <StatusBanner tone="warning">Replay unavailable: {replayError}</StatusBanner>
        )}
        {replayStatus === 'ready' && replaySession && (
          <>
            <ReplayChart snapshots={replaySession.poseSnapshots} />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                { label: 'Athlete', value: replaySession.user?.username || 'Unknown' },
                { label: 'Avg fluidity', value: Math.round(replaySession.summary?.averageFluidity ?? 0) },
                { label: 'Max fluidity', value: Math.round(replaySession.summary?.maxFluidity ?? 0) },
                { label: 'Total kinks', value: replaySession.summary?.totalKinks ?? 0 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(5,17,31,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span className="text-[10px] uppercase tracking-widest block mb-0.5" style={{ color: '#3d5a80' }}>{stat.label}</span>
                  <span className="text-sm font-bold" style={{ color: '#f0f6ff' }}>{stat.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default GymTab;
