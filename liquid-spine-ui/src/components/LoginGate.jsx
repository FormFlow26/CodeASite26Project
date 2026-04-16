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
    background: 'rgba(5, 17, 31, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    color: '#f0f6ff',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #07152c 0%, #041023 100%)' }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #00f2fe, transparent 70%)', filter: 'blur(70px)' }} />
      <div className="pointer-events-none absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-8 pb-10 w-full max-w-[430px] mx-auto">

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
        <div className="flex p-1 rounded-xl mb-6"
          style={{ background: 'rgba(13, 31, 53, 0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { key: 'login', label: 'Sign In' },
            { key: 'signup', label: 'Sign Up' },
          ].map(({ key, label }) => (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => handleModeSwitch(key)}
              className="relative flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ color: authMode === key ? '#f0f6ff' : '#3d5a80' }}
            >
              {authMode === key && (
                <motion.div
                  layoutId="auth-mode-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.18)' }}
                  transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                />
              )}
              <span className="relative z-10">{label}</span>
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
                    className="w-full px-4 py-3 rounded-xl"
                    style={inputBase}
                    onFocus={e => (e.target.style.borderColor = 'rgba(0,242,254,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
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
                    className="w-full px-4 py-3 rounded-xl"
                    style={inputBase}
                    onFocus={e => (e.target.style.borderColor = 'rgba(0,242,254,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
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
              className="w-full px-4 py-3 rounded-xl"
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
              className="w-full px-4 py-3 rounded-xl"
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
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,77,109,0.08)',
                  border: '1px solid rgba(255,77,109,0.22)',
                  color: '#ff4d6d',
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
            className="w-full py-4 rounded-xl text-sm font-bold tracking-wide mt-1 transition-opacity duration-200"
            style={{
              background: submitting
                ? 'rgba(0,242,254,0.25)'
                : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
              color: '#05111f',
              boxShadow: submitting ? 'none' : '0 8px 24px rgba(0,242,254,0.22)',
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
