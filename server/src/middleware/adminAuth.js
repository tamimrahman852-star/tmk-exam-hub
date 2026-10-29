import crypto from 'crypto';

export function adminAuth(req, res, next) {
  const given = Buffer.from(String(req.get('x-admin-key') || ''));
  const real = Buffer.from(String(process.env.ADMIN_KEY || ''));
  const ok = real.length > 0 && given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) return res.status(401).json({ error: 'Invalid admin key' });
  next();
}
