// Counts FAILED attempts per IP. After `max` failures inside the window the IP is blocked until it expires.
export function createFailLimiter(max, windowMs) {
  const hits = new Map();
  const recent = (ip) => {
    const now = Date.now();
    const r = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (r.length) hits.set(ip, r); else hits.delete(ip);
    return r;
  };
  return {
    blocked: (ip) => recent(ip).length >= max,
    fail: (ip) => { if (hits.size > 5000) hits.clear(); const r = recent(ip); r.push(Date.now()); hits.set(ip, r); },
    reset: (ip) => hits.delete(ip),
  };
}
