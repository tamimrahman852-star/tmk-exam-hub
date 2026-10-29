import { adminAuth } from './adminAuth.js';

// Simple in-memory per-IP limiter (resets on restart; fine for a free tier).
export function createLimiter(max, windowMs = 60 * 60 * 1000) {
  const hits = new Map();
  return {
    allow(ip) {
      const now = Date.now();
      if (hits.size > 5000) hits.clear();
      const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
      if (recent.length >= max) { hits.set(ip, recent); return false; }
      recent.push(now);
      hits.set(ip, recent);
      return true;
    },
  };
}

// PUBLIC_CREATE=true -> anyone can use the route (rate limited). Otherwise x-admin-key is required.
export function makeGuard(max) {
  const limiter = createLimiter(max);
  return (req, res, next) => {
    if (process.env.PUBLIC_CREATE !== 'true') return adminAuth(req, res, next);
    if (!limiter.allow(req.ip)) {
      return res.status(429).json({ error: 'Too many requests from your network. Please try again in an hour.' });
    }
    next();
  };
}
