import crypto from 'crypto';

export function makeSlug(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'exam';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}
