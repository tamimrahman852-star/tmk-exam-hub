import crypto from 'crypto';
import { createFailLimiter } from './failLimiter.js';
import { safeEqual } from '../middleware/adminAuth.js';

// The Feedback Admin Key is completely separate from the Upload Key (ADMIN_KEY).
// Signing in with it returns a signed token that expires after 2 hours, so the key itself is never stored in the browser.
const TTL_MS = 2 * 60 * 60 * 1000;
export const loginFailures = createFailLimiter(8, 15 * 60 * 1000);
export { safeEqual };

export function feedbackKeyProblem() {
  const k = process.env.FEEDBACK_KEY || '';
  if (!k) return 'FEEDBACK_KEY is not set';
  if (k.length < 10) return 'FEEDBACK_KEY must be at least 10 characters';
  if (k === process.env.ADMIN_KEY) return 'FEEDBACK_KEY must be different from ADMIN_KEY';
  return null;
}

// Changing FEEDBACK_KEY (or FEEDBACK_SESSION_SECRET) signs everyone out.
const secret = () => crypto.createHmac('sha256', 'tmk-feedback-session-v1')
  .update(String(process.env.FEEDBACK_SESSION_SECRET || process.env.FEEDBACK_KEY || '')).digest();
const sign = (payload) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

export function issueToken() {
  const expiresAt = Date.now() + TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp: expiresAt, s: 'feedback' })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

export function verifyToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return false;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return false;
  try {
    const d = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return d.s === 'feedback' && d.exp > Date.now();
  } catch { return false; }
}

export function feedbackAuth(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const problem = feedbackKeyProblem();
  if (problem) { console.error('Feedback admin is disabled:', problem); return res.status(503).json({ error: 'The feedback panel is not configured on the server' }); }
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (!m || !verifyToken(m[1])) return res.status(401).json({ error: 'Please sign in again' });
  next();
}
