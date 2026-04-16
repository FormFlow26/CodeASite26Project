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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();

    if (isSubmitting) return;

    if (authMode === 'signup' && (!trimmedName || !trimmedUsername)) {
      setError('Enter your full name and username to create your account.');
      return;
    }

    if (!trimmedEmail || !trimmedPassword) {
      setError(
        authMode === 'signup'
          ? 'Enter your email and password to create your account.'
          : 'Enter your email and password to continue.',
      );
      return;
    }

    if (authMode === 'signup' && trimmedPassword.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }

    setError('');

    try {
      await onLogin?.({ email: trimmedEmail, password: trimmedPassword, fullName: trimmedName, username: trimmedUsername, authMode });
    } catch (submitError) {
      setError(submitError.message || 'Authentication failed. Try again.');
    }
  };

  const inputStyle = {
    background: 'rgba(5, 17, 31, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#f0f6ff',
    fontSize: '16px',
  };

  const inputFocusClass = 'focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe]/30';

  return (
    <div
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #07152c 0%, #041023 100%)' }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, #00f2fe 0%, transparent 70%)', filter: 'blur(70px)' }}
      />
      <div
        className="pointer-events-none absolute bottom-10 -right-16 w-64 h-64 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-8 pb-10 max-w-[430px] mx-auto w-full">

        {/* Back button */}
        {onBack && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onBack}
            className="self-start flex items-center gap-1.5 mb-8 text-sm font-medium transition-colors duration-200"
            style={{ color: '#7a9bbf' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </motion.button>
        )}

        {/* Brand header */}
        <div className="mb-8">
          <span
            className="text-xs font-bold tracking-widest uppercase mb-3 block"
            style={{ color: '#3d5a80' }}
          >
            FormFlow
          </span>
          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#f0f6ff' }}>
            {authMode === 'signup' ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-sm" style={{ color: '#7a9bbf' }}>
            {authMode === 'signup'
              ? 'Join the training arena and start scoring your form.'
              : 'Sign in to continue your training session.'}
          </p>
        </div>

        {/* Auth toggle */}
        <div
          className="flex p-1 rounded-xl mb-6"
          style={{ background: 'rgba(13, 31, 53, 0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {['login', 'signup'].map((mode) => (
            <motion.button
              key={mode}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => { onSwitchMode?.(mode); setError(''); }}
              className="relative flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200"
              style={{ color: authMode === mode ? '#f0f6ff' : '#3d5a80' }}
            >
              {authMode === mode && (
                <motion.div
                  layoutId="auth-tab-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'rgba(0, 242, 254, 0.12)', border: '1px solid rgba(0,242,254,0.18)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 capitalize">{mode === 'login' ? 'Sign In' : 'Sign Up'}</span>
            </motion.button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence>
            {authMode === 'signup' && (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden flex flex-col gap-4"
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#3d5a80' }}>Full Name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-3 rounded-xl placeholder-[#3d5a80] transition-all duration-200 ${inputFocusClass}`}
                    style={inputStyle}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#3d5a80' }}>Username</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className={`w-full px-4 py-3 rounded-xl placeholder-[#3d5a80] transition-all duration-200 ${inputFocusClass}`}
                    style={inputStyle}
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#3d5a80' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`w-full px-4 py-3 rounded-xl placeholder-[#3d5a80] transition-all duration-200 ${inputFocusClass}`}
              style={inputStyle}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#3d5a80' }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authMode === 'signup' ? 'Min. 8 characters' : 'Enter your password'}
              className={`w-full px-4 py-3 rounded-xl placeholder-[#3d5a80] transition-all duration-200 ${inputFocusClass}`}
              style={inputStyle}
            />
          </label>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(255, 77, 109, 0.1)',
                  border: '1px solid rgba(255, 77, 109, 0.2)',
                  color: '#ff4d6d',
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl text-sm font-bold tracking-wide mt-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isSubmitting
                ? 'rgba(0, 242, 254, 0.3)'
                : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
              color: '#05111f',
              boxShadow: isSubmitting ? 'none' : '0 8px 24px rgba(0, 242, 254, 0.25)',
            }}
          >
            {isSubmitting
              ? 'Authorizing...'
              : authMode === 'signup'
                ? 'Create Account'
                : 'Enter FormFlow'}
          </motion.button>
        </form>

        {/* Switch mode link */}
        <p className="text-center text-sm mt-6" style={{ color: '#3d5a80' }}>
          {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { onSwitchMode?.(authMode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="font-semibold transition-colors duration-200 hover:opacity-80"
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
