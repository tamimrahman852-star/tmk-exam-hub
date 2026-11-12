import { Router } from 'express';
import { supabase } from '../supabase.js';
import { createLimiter } from '../middleware/guard.js';
import { feedbackAuth, feedbackKeyProblem, issueToken, loginFailures, safeEqual } from '../utils/feedbackAuth.js';

const KINDS = ['bug', 'suggestion', 'question', 'other'];
const STATUSES = ['new', 'read', 'resolved'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const clip = (v, n) => { const s = String(v ?? '').trim().slice(0, n); return s || null; };
const submitLimit = createLimiter(Number(process.env.FEEDBACK_LIMIT) || 5);   // per IP per hour

// ---------------------------------------------------------------------------
// PUBLIC: anyone can SEND feedback. There is deliberately no public way to read it.
// ---------------------------------------------------------------------------
export const feedbackPublic = Router();

feedbackPublic.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true });            // honeypot field: bots fill it, people never see it
  const message = String(b.message ?? '').trim();
  if (message.length < 5) return res.status(400).json({ error: 'Please write at least 5 characters.' });
  if (message.length > 2000) return res.status(400).json({ error: 'Please keep your message under 2000 characters.' });
  if (!submitLimit.allow(req.ip)) return res.status(429).json({ error: 'You have sent a lot of feedback recently. Please try again later.' });

  const page = clip(b.page, 200);
  const { error } = await supabase.from('feedbacks').insert({
    kind: KINDS.includes(b.kind) ? b.kind : 'other',
    message,
    name: clip(b.name, 60),
    contact: clip(b.contact, 100),
    page: page && page.startsWith('/') ? page : null,
    user_agent: clip(req.get('user-agent'), 200),
  });
  if (error) throw error;
  res.status(201).json({ ok: true });
}));

// ---------------------------------------------------------------------------
// ADMIN: needs the separate Feedback Admin Key (FEEDBACK_KEY), exchanged for a 2-hour signed token.
// ---------------------------------------------------------------------------
export const feedbackAdmin = Router();

feedbackAdmin.post('/login', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const problem = feedbackKeyProblem();
  if (problem) { console.error('Feedback admin is disabled:', problem); return res.status(503).json({ error: 'The feedback panel is not configured on the server' }); }
  if (loginFailures.blocked(req.ip)) return res.status(429).json({ error: 'Too many wrong keys. Please try again in 15 minutes.' });
  const key = String(req.body?.key ?? '');
  if (!key || !safeEqual(key, process.env.FEEDBACK_KEY)) {
    if (key) loginFailures.fail(req.ip);
    return res.status(401).json({ error: 'Invalid feedback key' });
  }
  loginFailures.reset(req.ip);
  res.json(issueToken());
});

feedbackAdmin.use(feedbackAuth);   // everything below needs a valid token

feedbackAdmin.get('/session', (_req, res) => res.json({ ok: true }));

feedbackAdmin.get('/feedbacks', wrap(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const kind = KINDS.includes(req.query.kind) ? req.query.kind : null;
  const q = String(req.query.q || '').trim().slice(0, 100);

  let query = supabase.from('feedbacks').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (status) query = query.eq('status', status);
  if (kind) query = query.eq('kind', kind);
  if (q) query = query.ilike('message', `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);

  const countOf = async (s) => {
    const { count, error } = await supabase.from('feedbacks').select('id', { count: 'exact', head: true }).eq('status', s);
    if (error) throw error;
    return count || 0;
  };
  const [{ data, error, count }, nNew, nRead, nResolved] = await Promise.all([query, countOf('new'), countOf('read'), countOf('resolved')]);
  if (error) throw error;
  res.json({ items: data, total: count ?? data.length, counts: { new: nNew, read: nRead, resolved: nResolved, all: nNew + nRead + nResolved } });
}));

feedbackAdmin.patch('/feedbacks/:id', wrap(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const status = req.body?.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Status must be new, read or resolved' });
  const { data, error } = await supabase.from('feedbacks').update({ status }).eq('id', req.params.id).select('id,status').maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Feedback not found' });
  res.json(data);
}));

feedbackAdmin.delete('/feedbacks/:id', wrap(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
  const { data, error } = await supabase.from('feedbacks').delete().eq('id', req.params.id).select('id');
  if (error) throw error;
  if (!data?.length) return res.status(404).json({ error: 'Feedback not found' });
  res.json({ ok: true });
}));
