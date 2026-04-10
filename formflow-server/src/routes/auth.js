import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { signJWT } from '../utils/tokenUtils.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { ipRateLimit } from '../middleware/rateLimiter.js';

const router = express.Router();

// 20 requests per minute per IP for all auth routes
const authLimiter = ipRateLimit(20, 60 * 1000, 'AUTH_RATE_LIMITED');
router.use(authLimiter);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res) => {
  try {
    const { displayName, email, password } = req.body || {};

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 20) {
      return res.status(400).json({
        error: 'displayName must be a string between 2 and 20 characters',
        code: 'INVALID_DISPLAY_NAME',
      });
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return res.status(400).json({
        error: 'A valid email is required',
        code: 'INVALID_EMAIL',
      });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters',
        code: 'INVALID_PASSWORD',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      displayName: displayName.trim(),
      email: email.toLowerCase(),
      passwordHash,
    });
    await user.save();

    const token = signJWT(user._id);
    return res.status(201).json({ user: user.toPublicJSON(), token });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Failed to register', code: 'REGISTER_FAILED' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const token = signJWT(user._id);
    return res.json({ user: user.toPublicJSON(), token });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Failed to log in', code: 'LOGIN_FAILED' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    return res.json({ user: user.toPublicJSON() });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Failed to fetch user', code: 'ME_FAILED' });
  }
});

export default router;
