import React, { useEffect, useRef, useState } from 'react';
import ReplayChart from './ReplayChart';
import { startFormFlow } from '../formflow/startFormFlow.js';
import { getRuntimeConfig } from '../lib/formflowApi';

const MUSCLE_PRESETS = {
  Quads: { fill: 30, goal: '4 Sets of 12', tips: 'Keep heels planted.' },
  Chest: { fill: 10, goal: '3 Sets of 10', tips: 'Slow eccentric movement.' },
  Back: { fill: 0, goal: '5 Sets of 8', tips: 'Pull with your elbows.' },
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
  const [muscleData, setMuscleData] = useState(MUSCLE_PRESETS);
  const videoRef = useRef(null);
  const formflowRef = useRef(null);

  const { userId, groupId, socketUrl } = getRuntimeConfig();
  const resolvedUserId = currentUserId || userId;
  const resolvedGroupId = currentGroupId || groupId;
  const hasTracking = Boolean(resolvedUserId && resolvedGroupId);

  const formStatus = 'perfect';
  const isCameraReady = cameraStatus === 'ready';
  const isRequestingCamera = cameraStatus === 'requesting';
  const activeMuscleData = muscleData[activeMuscle];
  const liveKinkCount =
    wipeoutEvent?.totalKinks ?? wipeoutEvent?.kinkSnapshots?.length ?? 0;
  const liveWipeoutMessage = wipeoutEvent
    ? `${wipeoutEvent.exerciseType || 'Workout'} wipeout detected. ${liveKinkCount} posture breaks need review.`
    : null;

  const stopCamera = () => {
    formflowRef.current?.stop();
    formflowRef.current = null;
    setCameraStatus('idle');
    setFeedback(INITIAL_FEEDBACK);
  };

  useEffect(() => {
    return () => {
      formflowRef.current?.stop();
    };
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraError('Camera access is not supported in this browser.');
      setFeedback({
        tone: 'warning',
        text: 'Form check is unavailable here, but you can still explore the rest of the prototype.',
      });
      return;
    }

    setCameraError('');
    setFeedback({
      tone: 'info',
      text: 'Loading MediaPipe and requesting camera access...',
    });
    setCameraStatus('requesting');

    try {
      const exerciseType = MUSCLE_TO_EXERCISE[activeMuscle] || 'squat';

      formflowRef.current = await startFormFlow({
        videoElement: videoRef.current,
        userId: resolvedUserId,
        groupId: resolvedGroupId,
        exerciseType,
        serverUrl: socketUrl,
        onRepComplete: ({ kinkDetected, fluidityScore }) => {
          if (kinkDetected) {
            onRejectedRep?.();
            setFeedback({
              tone: 'warning',
              text: `Form issue detected. Fluidity: ${Math.round(fluidityScore ?? 0)}. Reset and try again.`,
            });
          } else {
            setMuscleData((currentData) => ({
              ...currentData,
              [activeMuscle]: {
                ...currentData[activeMuscle],
                fill: Math.min(currentData[activeMuscle].fill + 15, 100),
              },
            }));
            onSuccessfulRep?.(activeMuscle);
            setFeedback({
              tone: 'success',
              text: `Clean rep synced. Fluidity: ${Math.round(fluidityScore ?? 0)}.`,
            });
          }
        },
      });

      setCameraStatus('ready');
      setFeedback({
        tone: 'success',
        text: 'MediaPipe live. Stay centered and perform a rep to start tracking.',
      });
    } catch (error) {
      setCameraStatus('error');
      formflowRef.current = null;
      setCameraError(
        error?.name === 'NotAllowedError'
          ? 'Camera permission was denied.'
          : 'Camera could not be started right now.',
      );
      setFeedback({
        tone: 'warning',
        text:
          error?.name === 'NotAllowedError'
            ? 'Permission was denied. You can retry when you are ready.'
            : 'There was a problem starting the camera. Try again in a moment.',
      });
    }
  };

  const handleRepSync = () => {
    if (!isCameraReady) {
      return;
    }

    if (formStatus === 'perfect') {
      setMuscleData((currentData) => ({
        ...currentData,
        [activeMuscle]: {
          ...currentData[activeMuscle],
          fill: Math.min(currentData[activeMuscle].fill + 15, 100),
        },
      }));
      onSuccessfulRep?.(activeMuscle);
      setFeedback({
        tone: 'success',
        text: `${activeMuscle} synced cleanly. Tank filled by 15%.`,
      });
      return;
    }

    onRejectedRep?.();
    setFeedback({
      tone: 'warning',
      text: 'Rep rejected. Reset your posture, brace, and try the movement again.',
    });
  };

  return (
    <div className="main-content gym-layout">
      <div className="muscle-selector" aria-label="Choose a muscle group">
        {Object.keys(muscleData).map((muscleName) => (
          <button
            key={muscleName}
            type="button"
            className={`muscle-chip ${activeMuscle === muscleName ? 'is-active' : ''}`}
            onClick={() => setActiveMuscle(muscleName)}
          >
            {muscleName}
          </button>
        ))}
      </div>

      <div className="glass-panel">
        <div className="panel-heading">
          <div>
            <h2 className="panel-title">{activeMuscle}</h2>
            <p className="panel-subtitle">Live form tracking with animated recovery feedback.</p>
          </div>

          <div className="panel-side-note">
            <span>Goal</span>
            <strong>{activeMuscleData.goal}</strong>
          </div>
        </div>

        <div className="panel-meta">
          <div className="meta-card">
            <span>Coach Cue</span>
            <strong>{activeMuscleData.tips}</strong>
          </div>
          <div className="meta-card">
            <span>Status</span>
            <strong>{isCameraReady ? 'Tracking live' : 'Waiting to start'}</strong>
          </div>
        </div>

        <div className="camera-stage">
          <div
            className="water-container"
            style={{ transform: isCameraReady ? 'scale(0.8)' : 'scale(1)' }}
          >
            <div
              className="water-fill"
              style={{ height: `${activeMuscleData.fill}%` }}
            />
            <div className="water-level-label">{activeMuscleData.fill}%</div>
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
                borderRadius: '15px',
                border: `4px solid ${
                  formStatus === 'perfect'
                    ? 'var(--moana-cyan)'
                    : 'var(--moana-coral)'
                }`,
                boxShadow:
                  formStatus === 'bad'
                    ? '0 0 20px var(--moana-coral)'
                    : '0 0 20px rgba(0, 242, 254, 0.15)',
                transition: 'all 0.3s ease',
              }}
            />

            {formStatus === 'bad' && (
              <div className="camera-banner">Alignment error detected</div>
            )}
          </div>
        </div>

        {liveWipeoutMessage && (
          <div className="status-banner" data-tone="warning">
            {liveWipeoutMessage}
          </div>
        )}

        {cameraError && (
          <div className="status-banner" data-tone="warning">
            {cameraError}
          </div>
        )}

        {!hasTracking && (
          <div className="status-banner" data-tone="warning">
            Log in or set VITE_USER_ID and VITE_GROUP_ID in liquid-spine-ui/.env to enable live tracking
          </div>
        )}

        <div className="status-banner" data-tone={feedback.tone}>
          {feedback.text}
        </div>

        {isCameraReady ? (
          <div className="action-stack">
            <button
              type="button"
              onClick={handleRepSync}
              className={`primary-button ${formStatus === 'bad' ? 'is-disabled' : ''}`}
            >
              {formStatus === 'perfect' ? 'SYNC PERFECT REP' : 'REP REJECTED'}
            </button>

            <button type="button" onClick={stopCamera} className="ghost-button">
              Stop camera
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            className="secondary-button"
            disabled={isRequestingCamera || !hasTracking}
          >
            {isRequestingCamera ? 'REQUESTING CAMERA...' : 'START FORM CHECK'}
          </button>
        )}
      </div>

      <div className={`glass-panel live-session-panel ${isWipeoutActive ? 'is-wipeout' : ''}`}>
        <div className="panel-heading">
          <div>
            <h3 className="panel-title">Current Session</h3>
            <p className="panel-subtitle">
              Live coaching alerts appear here when the backend flags movement issues.
            </p>
          </div>
          <div className="panel-side-note">
            <span>Realtime State</span>
            <strong>{wipeoutEvent ? 'Tracking alerts' : 'Standing by'}</strong>
          </div>
        </div>

        {wipeoutEvent ? (
          <div className="session-stat-grid">
            <div className="session-stat">
              <span>Total kinks</span>
              <strong>{liveKinkCount}</strong>
            </div>
            <div className="session-stat">
              <span>Average fluidity</span>
              <strong>{Math.round(wipeoutEvent.averageFluidity ?? 0)}</strong>
            </div>
            <div className="session-stat">
              <span>Max fluidity</span>
              <strong>{Math.round(wipeoutEvent.maxFluidity ?? 0)}</strong>
            </div>
            <div className="session-stat">
              <span>Exercise</span>
              <strong>{wipeoutEvent.exerciseType || 'Unknown'}</strong>
            </div>
          </div>
        ) : (
          <div className="status-banner" data-tone="info">
            No coaching alerts yet. Once a flagged rep is detected, this panel will update instantly.
          </div>
        )}
      </div>

      <div className="glass-panel replay-panel">
        <div className="panel-heading">
          <div>
            <h3 className="panel-title">Post-Workout Analysis</h3>
            <p className="panel-subtitle">
              The latest flagged set loads here for a quick fluidity-over-time review.
            </p>
          </div>
        </div>

        {replayStatus === 'idle' && (
          <div className="status-banner" data-tone="info">
            Waiting for replay data from the latest flagged set.
          </div>
        )}

        {replayStatus === 'loading' && (
          <div className="status-banner" data-tone="info">
            Loading latest session replay...
          </div>
        )}

        {replayStatus === 'error' && (
          <div className="status-banner" data-tone="warning">
            Replay unavailable right now: {replayError}
          </div>
        )}

        {replayStatus === 'ready' && replaySession && (
          <>
            <ReplayChart snapshots={replaySession.poseSnapshots} />
            <div className="session-stat-grid replay-meta">
              <div className="session-stat">
                <span>User</span>
                <strong>{replaySession.user?.username || 'Unknown athlete'}</strong>
              </div>
              <div className="session-stat">
                <span>Average fluidity</span>
                <strong>{Math.round(replaySession.summary?.averageFluidity ?? 0)}</strong>
              </div>
              <div className="session-stat">
                <span>Max fluidity</span>
                <strong>{Math.round(replaySession.summary?.maxFluidity ?? 0)}</strong>
              </div>
              <div className="session-stat">
                <span>Total kinks</span>
                <strong>{replaySession.summary?.totalKinks ?? 0}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GymTab;
