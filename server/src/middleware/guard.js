import { adminAuth } from './adminAuth.js';

// If PUBLIC_CREATE=true anyone can use the route (limited per IP per hour).
// Otherwise the x-admin-key header is required.
export function makeGuard(max) {
  const hits = new Map();
  const WINDOW = 60 * 60 * 1000;

  return (req, res, next) => {
    if (process.env.PUBLIC_CREATE !== 'true') return adminAuth(req, res, next);

    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((t) => now - t < WINDOW);
    if (recent.length >= max) {
      return res.status(429).json({ error: 'Too many requests from your network. Please try again in an hour.' });
    }
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}
