import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const submitting = isSubmitting || localSubmitting;

  const handleModeSwitch = (mode) => {
    setError('');
    onSwitchMode?.(mode);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();

    if (authMode === 'signup' && !trimmedName) {
      setError('Enter your full name.');
      return;
    }
    if (authMode === 'signup' && !trimmedUsername) {
      setError('Choose a username.');
      return;
    }
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (!trimmedPassword) {
      setError('Enter your password.');
      return;
    }
    if (authMode === 'signup' && trimmedPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError('');
    setLocalSubmitting(true);

    try {
      await onLogin?.({
        email: trimmedEmail,
        password: trimmedPassword,
        fullName: trimmedName,
        username: trimmedUsername,
        authMode,
      });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLocalSubmitting(false);
    }
  };

  const inputBase = {
    background: '#0b1929',
    border: '1px solid #1a2e45',
    color: '#f0f6ff',
    fontSize: '16px',
    outline: 'none',
    borderRadius: 0,
    transition: 'border-color 0.2s',
  };

  return (
    <div
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: '#05111f' }}
    >
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10 w-full max-w-[430px] mx-auto">

        {/* Back */}
        {onBack && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onBack}
            className="self-start flex items-center gap-1.5 mb-8 text-sm font-medium"
            style={{ color: '#7a9bbf' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </motion.button>
        )}

        {/* Brand */}
        <div className="mb-8">
          <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#3d5a80' }}>
            FormFlow
          </p>
          <h1 className="text-[2rem] font-bold tracking-tight leading-tight mb-2" style={{ color: '#f0f6ff' }}>
            {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm" style={{ color: '#7a9bbf' }}>
            {authMode === 'signup'
              ? 'Join FormFlow and start scoring your form in real time.'
              : 'Sign in to continue your training session.'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-6"
          style={{ background: '#0b1929', border: '1px solid #1a2e45' }}>
          {[
            { key: 'login', label: 'Sign In' },
            { key: 'signup', label: 'Sign Up' },
          ].map(({ key, label }) => (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleModeSwitch(key)}
              className="relative flex-1 py-2.5 text-sm font-bold tracking-wide"
              style={{
                color: authMode === key ? '#05111f' : '#5a7a9a',
                background: authMode === key ? '#00f2fe' : 'transparent',
                border: 'none',
                borderRadius: 0,
                cursor: 'pointer',
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          <AnimatePresence initial={false}>
            {authMode === 'signup' && (
              <motion.div
                key="signup-extra"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden flex flex-col gap-4"
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#3d5a80' }}>Full Name</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3"
                    style={inputBase}
                    onFocus={e => (e.target.style.borderColor = '#00f2fe')}
                    onBlur={e => (e.target.style.borderColor = '#1a2e45')}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#3d5a80' }}>Username</span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3"
                    style={inputBase}
                    onFocus={e => (e.target.style.borderColor = '#00f2fe')}
                    onBlur={e => (e.target.style.borderColor = '#1a2e45')}
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#3d5a80' }}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3"
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = 'rgba(0,242,254,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#3d5a80' }}>Password</span>
            <input
              type="password"
              autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === 'signup' ? 'Min. 8 characters' : '••••••••'}
              className="w-full px-4 py-3"
              style={inputBase}
              onFocus={e => (e.target.style.borderColor = 'rgba(0,242,254,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
            />
          </label>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="px-4 py-3 text-sm"
                style={{
                  background: '#0b1929',
                  border: '1px solid #ff4d6d',
                  color: '#ff4d6d',
                  borderRadius: 0,
                }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={submitting}
            className="w-full py-4 text-sm font-bold tracking-widest uppercase mt-1"
            style={{
              background: submitting ? '#1a2e45' : '#00f2fe',
              color: submitting ? '#2d4a66' : '#05111f',
              border: 'none',
              borderRadius: 0,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting
              ? (authMode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (authMode === 'signup' ? 'Create Account' : 'Sign In')}
          </motion.button>
        </form>

        {/* Switch mode */}
        <p className="text-center text-sm mt-6" style={{ color: '#3d5a80' }}>
          {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => handleModeSwitch(authMode === 'login' ? 'signup' : 'login')}
            className="font-semibold hover:opacity-80 transition-opacity"
            style={{ color: '#00f2fe' }}
          >
            {authMode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginGate;
