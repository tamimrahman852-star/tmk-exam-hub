import crypto from 'crypto';
import { createFailLimiter } from '../utils/failLimiter.js';

const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();
export const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));   // constant time, hides the key length too

// 10 wrong upload keys from one IP in 15 minutes = blocked for the rest of the window.
const failures = createFailLimiter(10, 15 * 60 * 1000);

// Upload Key: required to create exams and to read question pages with AI.
export function adminAuth(req, res, next) {
  if (failures.blocked(req.ip)) return res.status(429).json({ error: 'Too many wrong keys. Please try again in 15 minutes.' });
  const given = String(req.get('x-admin-key') || '');
  const real = String(process.env.ADMIN_KEY || '');
  const ok = real.length > 0 && safeEqual(given, real);
  if (!ok) {
    if (given) failures.fail(req.ip);
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  failures.reset(req.ip);
  next();
}
