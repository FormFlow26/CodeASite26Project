# FormFlow — Frontend Design Constitution

## Product

FormFlow is a real-time AI-powered exercise form analysis PWA. The camera watches you lift, scores movement quality rep-by-rep, and broadcasts wipeout alerts to your friend group via Socket.IO. Core screens: Landing → Auth → Home (onboarding) → Gym (live workout) → Social (leaderboard).

---

## Design Standard

**Target feel**: Premium fintech/sports app — Robinhood's clean typographic hierarchy meets AAA video game website motion.  
**Primary surface**: Mobile Safari and Chrome on iOS/Android. Every interaction must feel native-smooth — no jank, no layout shift, no rubber-band scroll fighting.  
**Anti-pattern**: "Vibe coded" — inconsistent spacing, random CSS keyframes, unsystematic color usage, modals that don't belong on mobile.

---

## Mandatory Library Stack

| Library | Purpose |
|---|---|
| `framer-motion` | Page/tab transitions, gesture springs, shared-element layout animations |
| `tailwindcss` v4 | All layout, spacing, color, and typography — replaces vanilla CSS |
| `@radix-ui/*` + `shadcn/ui` | Accessible primitives: sheets, dialogs, sliders, tooltips |
| `gsap` + `@gsap/react` | Hero timelines, scroll-driven reveals, number roll-ups |
| `lenis` | Momentum scroll on mobile; integrates with GSAP RAF ticker |

**Install order when setting up a fresh environment:**
```
npm i framer-motion gsap @gsap/react lenis
npm i tailwindcss @tailwindcss/vite
npx shadcn@latest init
```

Never introduce a new animation technique (CSS keyframes, JS `setInterval` counters, etc.) when Framer Motion or GSAP can do the job.

---

## Design Tokens

Define these in `tailwind.config.js` or the CSS layer — reference them everywhere:

```js
colors: {
  bg: {
    base: '#05111f',      // deep navy — page background
    surface: '#0d1f35',   // cards, panels
    elevated: '#112340',  // elevated/active panels
  },
  accent: {
    cyan: '#00f2fe',      // primary brand, CTAs, active states
    indigo: '#6366f1',    // secondary accent, social/leaderboard
  },
  danger: '#ff4d6d',      // wipeout alerts, errors
  text: {
    primary: '#f0f6ff',
    secondary: '#7a9bbf',
    muted: '#3d5a80',
  },
}

borderRadius: {
  sm: '8px',
  DEFAULT: '12px',
  lg: '20px',
  full: '9999px',
}
```

**Typography**: Import `Inter` variable font from Google Fonts. Use weights 400 / 500 / 600 / 700 only. Use the Tailwind type scale (`text-xs` through `text-2xl`) — no arbitrary `font-size` values.

---

## Animation Principles

### Framer Motion — screen transitions & interactive elements
- Wrap the top-level view router with `<AnimatePresence mode="wait">` — every screen enters/exits with motion
- Default page transition: `initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}` with `transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}`
- Every tappable/clickable element uses `whileTap={{ scale: 0.96 }}` — mimics native haptic feedback
- Spring physics for toggles, nav indicators, and expandable elements: `type: "spring", stiffness: 300, damping: 30`
- Shared element transitions for bottom tab active indicator: use `layoutId="tab-indicator"` on the active pill

### GSAP — hero animations & number roll-ups
- Landing page: single `gsap.timeline({ defaults: { ease: "power3.out" } })` with staggered element reveals
- Scroll-driven sections on landing: use `ScrollTrigger` with `scrub: 1`
- All numeric values (fluidity score, rep count, leaderboard ranks): animate with GSAP `gsap.to(obj, { val: target, duration: 0.6, ease: "power2.out", onUpdate })` — never update state on every tick, batch via `requestAnimationFrame`
- Fluidity arc gauge: SVG `strokeDashoffset` driven by a GSAP tween, not CSS transitions

### Lenis — scroll
- Initialize in `main.jsx` before React render:
```js
const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
```
- Prevent Lenis on camera/video containers: `data-lenis-prevent`

### Golden rules
- Animate `transform` and `opacity` only — never `height`, `width`, `top`, `left`, `margin`
- Always provide `useReducedMotion()` fallback — opacity-only fade when reduced motion is preferred
- No CSS `@keyframes` for new UI — migrate existing ones to Framer/GSAP as components are touched

---

## Component Patterns

### Layout
- Page containers: `min-h-[100dvh]` — always `dvh`, never `vh` (iOS address bar)
- Bottom nav clearance: `pb-[env(safe-area-inset-bottom)]`
- Cards: `rounded-2xl bg-surface border border-white/5 shadow-2xl`

### Touch targets
- All interactive elements: minimum `44px × 44px` hit area
- Apply `-webkit-tap-highlight-color: transparent` globally in `index.css`
- Input `font-size` ≥ `16px` — prevents Safari auto-zoom on focus

### Overlays / modals
- Use Radix `Sheet` (bottom-drawer) for all mobile overlays — no center-screen dialogs on small viewports
- Sheets animate up from bottom with Framer spring; backdrop `bg-black/60 backdrop-blur-sm`

### Loading states
- Skeleton shimmer: `animate-pulse rounded-lg bg-white/5` — never spinners
- Async data: always render skeleton at the same dimensions as final content to prevent layout shift

### Navigation
- `BottomNav` active state: Framer `layoutId` shared animated background pill
- Tab content transitions: `AnimatePresence` with `mode="wait"` so old tab exits before new one enters

### Fluidity gauge
- SVG arc with `strokeDasharray` / `strokeDashoffset`
- Driven by `useMotionValue` + `useTransform` from Framer, or a GSAP tween
- Score number rolls up with GSAP on each rep completion

---

## What to Avoid

| Avoid | Use instead |
|---|---|
| `style={{ color: '#00f2fe' }}` | Tailwind class `text-accent-cyan` |
| New `@keyframes` in CSS | `motion.div` or GSAP timeline |
| `position: fixed` with `100vh` hacks | `h-[100dvh]` + `fixed` |
| `backdrop-filter` stacked > 1 level | Single blur layer per z-index stack |
| `overflow: hidden` on `body` | Lenis `stop()` / `start()` |
| Spinners | Skeleton shimmer |
| Center-screen modals on mobile | Radix `Sheet` bottom drawer |
| Arbitrary font sizes | Tailwind type scale |
| Icon packs beyond `lucide-react` | Lucide (ships with shadcn) |

---

## File Structure Reference

```
liquid-spine-ui/
  src/
    main.jsx          ← Lenis init + GSAP ticker
    App.jsx           ← AnimatePresence wrapper + view router
    App.css           ← Being incrementally replaced by Tailwind
    index.css         ← Global resets, Inter import, CSS vars (transitional)
    components/
      ui/             ← shadcn auto-generated primitives (don't edit manually)
      BottomNav.jsx
      Header.jsx
      GymTab.jsx
      SocialTab.jsx
      ReplayChart.jsx
      OnboardingModal.jsx
    formflow/         ← Pose engine, fluidity scoring, kink detection (no UI)
    lib/
      formflowApi.js  ← HTTP + Socket.IO client
  vite.config.js      ← @tailwindcss/vite plugin registered here
```

**Migration strategy**: Migrate CSS component-by-component. Don't delete `App.css` in one shot. As you touch a component, convert its styles to Tailwind and delete the corresponding CSS rules. The CSS variables for brand colors stay until all components are migrated.

---

## Verification Checklist (after any frontend session)

- [ ] `npm run dev` exits with no errors or warnings
- [ ] Tab switching shows Framer `AnimatePresence` cross-fade (no white flash)
- [ ] Fluidity gauge animates smoothly on rep completion (GSAP arc tween)
- [ ] No `100vh` references remain in modified files
- [ ] Mobile Safari: no address-bar layout shift, inputs don't zoom
- [ ] Lenis scroll active on landing page; camera view has `data-lenis-prevent`
- [ ] All new interactive elements have `whileTap={{ scale: 0.96 }}`
- [ ] Skeleton shown during async loads (no spinners added)
