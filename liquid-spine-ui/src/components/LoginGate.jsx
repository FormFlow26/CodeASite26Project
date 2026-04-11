import React, { useState } from 'react';

const LOGIN_HIGHLIGHTS = [
  {
    title: 'Live Motion Scoring',
    copy: 'Realtime posture feedback, combo tracking, and wipeout alerts in one flow.',
  },
  {
    title: 'Competitive Energy',
    copy: 'A fitness product that feels closer to a game arena than a dashboard.',
  },
  {
    title: 'Judge-Ready Demo',
    copy: 'Strong first impression, clear value story, and visual drama from the first click.',
  },
];

const LoginGate = ({
  authMode = 'login',
  onLogin,
  onSwitchMode,
  onBack,
  isSubmitting = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();

    if (isSubmitting) {
      return;
    }

    if (authMode === 'signup' && (!trimmedName || !trimmedUsername)) {
      setError('Enter your full name and username to create your FormFlow account.');
      return;
    }

    if (!trimmedEmail || !trimmedPassword) {
      setError(
        authMode === 'signup'
          ? 'Enter your email and password to create your FormFlow account.'
          : 'Enter your email and password to continue into FormFlow.',
      );
      return;
    }

    if (authMode === 'signup' && trimmedPassword.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }

    setError('');

    try {
      await onLogin?.({
        email: trimmedEmail,
        password: trimmedPassword,
        fullName: trimmedName,
        username: trimmedUsername,
        authMode,
      });
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed. Try again.');
    }
  };

  return (
    <div className="login-screen page-transition">
      <div className="login-ambient login-ambient-cyan" />
      <div className="login-ambient login-ambient-coral" />
      <div className="login-grid-lines" />

      <div className="login-shell">
        <div className="login-brand">
          {onBack && (
            <button type="button" className="page-back-button auth-back-button" onClick={onBack}>
              ← Back
            </button>
          )}
          <p className="session-kicker">Entry Protocol</p>
          <div className="login-hero-stack">
            <span className="login-hero-chip">Liquid Spine Arena</span>
            <h1 className="app-title login-brand-title">FORMFLOW</h1>
            <h2 className="login-hero-heading">
              Train like a player.
              <br />
              Recover like a pro.
            </h2>
          </div>
          <p className="login-copy">
            Enter the training arena before the onboarding sequence begins.
            This keeps the demo feeling like a premium fitness game, not a raw prototype.
          </p>

          <div className="login-highlight-grid">
            {LOGIN_HIGHLIGHTS.map((item) => (
              <div key={item.title} className="login-highlight-card">
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </div>
            ))}
          </div>
        </div>

        <form className="glass-panel login-card" onSubmit={handleSubmit}>
          <div className="login-card-header">
            <span className="login-badge">Access Portal</span>
            <h2 className="login-title">
              {authMode === 'signup' ? 'Create Your Account' : 'Sign In to Begin'}
            </h2>
            <p className="card-copy">
              {authMode === 'signup'
                ? 'Create your account to save sessions, climb the leaderboard, and unlock the social feed.'
                : 'Sign in with your FormFlow account to continue into the training arena.'}
            </p>
          </div>

          <div className="login-auth-toggle">
            <button
              type="button"
              className={`login-auth-pill ${authMode === 'login' ? 'is-selected' : ''}`}
              onClick={() => onSwitchMode?.('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`login-auth-pill ${authMode === 'signup' ? 'is-selected' : ''}`}
              onClick={() => onSwitchMode?.('signup')}
            >
              Sign Up
            </button>
          </div>

          {authMode === 'signup' && (
            <>
              <label className="login-field">
                <span>Full Name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                />
              </label>

              <label className="login-field">
                <span>Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Choose a username"
                />
              </label>
            </>
          )}

          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </label>

          {error && (
            <div className="status-banner" data-tone="warning">
              {error}
            </div>
          )}

          <button type="submit" className="primary-button login-submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Authorizing...'
              : authMode === 'signup'
                ? 'Create Account'
                : 'Enter FormFlow'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginGate;
