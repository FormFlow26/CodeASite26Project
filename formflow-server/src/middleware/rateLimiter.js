/**
 * Simple in-memory rate limiter. Returns a function that takes a key and
 * returns true if the request is allowed, false if rate limited. Empty
 * entries are GC'd from the underlying Map to prevent unbounded growth.
 */
export function createRateLimiter(limit, windowMs) {
  const store = new Map();
  return (key) => {
    const now = Date.now();
    const existing = store.get(key) || [];
    const timestamps = existing.filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      // Refresh the trimmed window so we don't permanently grow stale state
      store.set(key, timestamps);
      return false;
    }

    timestamps.push(now);

    if (timestamps.length === 0) {
      store.delete(key);
    } else {
      store.set(key, timestamps);
    }
    return true;
  };
}

/**
 * Express middleware factory for IP-based rate limiting.
 */
export function ipRateLimit(limit, windowMs, codeLabel = 'RATE_LIMITED') {
  const limiter = createRateLimiter(limit, windowMs);
  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!limiter(key)) {
      return res
        .status(429)
        .json({ error: 'Too many requests', code: codeLabel });
    }
    next();
  };
}

/**
 * Express middleware factory for user-based rate limiting. Requires requireAuth
 * to have populated req.user.
 */
export function userRateLimit(limit, windowMs, codeLabel = 'RATE_LIMITED') {
  const limiter = createRateLimiter(limit, windowMs);
  return (req, res, next) => {
    const key = req.user ? String(req.user._id) : req.ip || 'anon';
    if (!limiter(key)) {
      return res
        .status(429)
        .json({ error: 'Too many requests', code: codeLabel });
    }
    next();
  };
}
