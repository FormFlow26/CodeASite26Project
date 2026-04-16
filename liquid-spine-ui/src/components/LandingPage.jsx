import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import fitnessDuoCyan from '../assets/fitness-duo-cyan.png';

const FEATURES = [
  { label: 'AI Form Coach', desc: 'Rep-by-rep posture scoring' },
  { label: 'Live Leaderboard', desc: 'Compete with your group' },
  { label: 'Wipeout Alerts', desc: 'Real-time fault detection' },
];

const STATS = [
  { value: '100', unit: 'pt', label: 'Fluidity scale' },
  { value: '<2s', unit: '', label: 'Alert latency' },
  { value: '3', unit: 'x', label: 'Exercise types' },
];

const LandingPage = ({ onStart }) => {
  const heroRef = useRef(null);
  const chipRef = useRef(null);
  const headingRef = useRef(null);
  const subRef = useRef(null);
  const statsRef = useRef(null);
  const ctaRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(chipRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 })
        .fromTo(headingRef.current, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.65 }, '-=0.25')
        .fromTo(subRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3')
        .fromTo(statsRef.current?.children ? Array.from(statsRef.current.children) : [], { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.45 }, '-=0.2')
        .fromTo(ctaRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45 }, '-=0.15')
        .fromTo(imageRef.current, { opacity: 0, scale: 0.94, y: 24 }, { opacity: 1, scale: 1, y: 0, duration: 0.8 }, '-=0.6');
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={heroRef}
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: '#05111f' }}
      data-lenis-prevent
    >

      {/* Nav bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 pt-8 pb-4">
        <span className="text-sm font-bold tracking-widest text-[#00f2fe] uppercase">FormFlow</span>
        <button
          type="button"
          onClick={() => onStart?.('login')}
          className="text-sm font-semibold text-[#7a9bbf] hover:text-[#f0f6ff] transition-colors duration-200"
        >
          Sign in
        </button>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 pt-6 pb-10 max-w-[430px] mx-auto w-full">

        {/* Chip */}
        <div ref={chipRef} className="opacity-0 mb-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-widest uppercase"
            style={{
              background: '#05111f',
              border: '1px solid #00f2fe',
              color: '#00f2fe',
              borderRadius: 0,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse" />
            AI-Powered · Live Scoring
          </span>
        </div>

        {/* Heading */}
        <div ref={headingRef} className="opacity-0 mb-4">
          <h1
            className="text-[2.6rem] font-bold leading-[1.05] tracking-tight"
            style={{ color: '#f0f6ff' }}
          >
            Train smarter.<br />
            <span style={{ color: '#00f2fe' }}>Win harder.</span>
          </h1>
        </div>

        {/* Subheading */}
        <p
          ref={subRef}
          className="opacity-0 text-base leading-relaxed mb-6"
          style={{ color: '#7a9bbf' }}
        >
          FormFlow watches your form rep-by-rep using your camera, scores your movement quality, and alerts your crew when you wipeout.
        </p>

        {/* Hero image */}
        <div
          ref={imageRef}
          className="opacity-0 relative w-full overflow-hidden mb-6"
          style={{
            border: '1px solid #1a2e45',
            background: '#0b1929',
          }}
        >
          <img
            src={fitnessDuoCyan}
            alt="Athletes training with FormFlow"
            className="w-full object-cover"
            style={{ maxHeight: '220px', objectPosition: 'top center' }}
          />
          {/* Live score overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
              style={{ background: '#05111f', border: '1px solid #00f2fe', color: '#00f2fe', borderRadius: 0 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse" />
              Live tracking
            </div>
            <div
              className="px-2.5 py-1 text-xs font-bold"
              style={{ background: '#05111f', border: '1px solid #1a2e45', color: '#f0f6ff', borderRadius: 0 }}
            >
              Fluidity 87%
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div ref={statsRef} className="grid grid-cols-3 gap-3 mb-6">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="opacity-0 flex flex-col items-center py-3"
              style={{
                background: '#0b1929',
                border: '1px solid #1a2e45',
              }}
            >
              <span className="text-xl font-bold" style={{ color: '#f0f6ff' }}>
                {stat.value}<span className="text-sm" style={{ color: '#00f2fe' }}>{stat.unit}</span>
              </span>
              <span className="text-[10px] mt-0.5 text-center" style={{ color: '#7a9bbf' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-col gap-2 mb-8">
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: '#0b1929',
                border: '1px solid #1a2e45',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#00f2fe', boxShadow: '0 0 6px #00f2fe' }}
              />
              <div>
                <span className="text-sm font-semibold" style={{ color: '#f0f6ff' }}>{f.label}</span>
                <span className="ml-2 text-xs" style={{ color: '#3d5a80' }}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div ref={ctaRef} className="opacity-0 flex flex-col gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onStart?.('signup')}
            className="w-full py-4 text-sm font-bold tracking-widest uppercase"
            style={{
              background: '#00f2fe',
              color: '#05111f',
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            Get Started Free
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onStart?.('login')}
            className="w-full py-4 text-sm font-semibold"
            style={{
              background: '#0b1929',
              border: '1px solid #1a2e45',
              borderRadius: 0,
              color: '#5a7a9a',
              cursor: 'pointer',
            }}
          >
            Sign In
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
