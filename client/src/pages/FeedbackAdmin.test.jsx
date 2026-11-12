import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import FeedbackAdmin from './FeedbackAdmin.jsx';

const KEY = 'fb-key-123456';
const mk = (id, kind, status, message, extra = {}) => ({ id, kind, status, message, name: null, contact: null, page: null, user_agent: null, created_at: '2026-11-05T10:00:00Z', ...extra });
let db, calls, expireNext;
const json = (status, data) => ({ ok: status < 400, status, json: async () => JSON.parse(JSON.stringify(data)) });   // a real response is a fresh copy

beforeEach(() => {
  sessionStorage.clear(); calls = []; expireNext = false;
  db = [
    mk('a1', 'bug', 'new', 'Login button broken on my phone', { name: 'Rahim', contact: '01700000000', page: '/exam/chem' }),
    mk('a2', 'suggestion', 'new', 'Please add a dark mode'),
    mk('a3', 'question', 'read', 'How do I get an upload key?'),
  ];
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    const u = new URL(String(url), 'http://x'); const method = opts.method || 'GET';
    calls.push({ path: u.pathname, search: u.search, method, auth: opts.headers?.Authorization, body: opts.body ? JSON.parse(opts.body) : null });
    if (u.pathname.endsWith('/login')) return JSON.parse(opts.body).key === KEY ? json(200, { token: 'signed.token', expiresAt: Date.now() + 7200000 }) : json(401, { error: 'Invalid feedback key' });
    if (expireNext) return json(401, { error: 'Please sign in again' });
    if (opts.headers?.Authorization !== 'Bearer signed.token') return json(401, { error: 'Please sign in again' });
    const id = u.pathname.split('/').pop();
    if (method === 'PATCH') { db.find((x) => x.id === id).status = JSON.parse(opts.body).status; return json(200, { ok: true }); }
    if (method === 'DELETE') { db = db.filter((x) => x.id !== id); return json(200, { ok: true }); }
    const st = u.searchParams.get('status'), kd = u.searchParams.get('kind'), q = (u.searchParams.get('q') || '').toLowerCase();
    const list = db.filter((x) => (!st || x.status === st) && (!kd || x.kind === kd) && x.message.toLowerCase().includes(q));
    const n = (s) => db.filter((x) => x.status === s).length;
    return json(200, { items: list, total: list.length, counts: { new: n('new'), read: n('read'), resolved: n('resolved'), all: db.length } });
  });
});

const view = () => render(<MemoryRouter><FeedbackAdmin /></MemoryRouter>);
async function signIn(user) {
  await user.type(screen.getByLabelText(/feedback admin key/i), KEY);
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  await screen.findByRole('heading', { name: /feedback inbox/i });
}
const card = (text) => screen.getByText(text).closest('article');
const lastList = () => [...calls].reverse().find((c) => c.path.endsWith('/feedbacks') && c.method === 'GET');

test('visitors see only the sign-in screen: no feedback is requested or shown', () => {
  view();
  expect(screen.getByLabelText(/feedback admin key/i)).toHaveAttribute('type', 'password');
  expect(screen.queryByText(/login button broken/i)).not.toBeInTheDocument();
  expect(calls).toHaveLength(0);
  expect(document.head.querySelector('meta[name="robots"]')?.content).toBe('noindex,nofollow');
});

test('a wrong key is refused', async () => {
  const user = userEvent.setup();
  view();
  await user.type(screen.getByLabelText(/feedback admin key/i), 'not-the-key');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/not correct/i);
  expect(sessionStorage.length).toBe(0);
  expect(calls.every((c) => !c.path.endsWith('/feedbacks'))).toBe(true);
});

test('signing in stores only a token (never the key) and lists the feedback with counts', async () => {
  const user = userEvent.setup();
  view();
  await signIn(user);
  expect(screen.getByText('Login button broken on my phone')).toBeInTheDocument();
  expect(screen.getByText('👤 Rahim')).toBeInTheDocument();
  expect(screen.getByText('📞 01700000000')).toBeInTheDocument();
  expect(screen.getByText('📄 /exam/chem')).toBeInTheDocument();
  expect(lastList().auth).toBe('Bearer signed.token');
  const stored = sessionStorage.getItem('tmk-feedback-session');
  expect(stored).toContain('signed.token');
  expect(stored).not.toContain(KEY);
  expect(screen.getByRole('button', { name: /^3\s*All/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^2\s*New/ })).toBeInTheDocument();
});

test('an existing valid session goes straight to the inbox', async () => {
  sessionStorage.setItem('tmk-feedback-session', JSON.stringify({ token: 'signed.token', expiresAt: Date.now() + 100000 }));
  view();
  expect(await screen.findByText('Please add a dark mode')).toBeInTheDocument();
  expect(calls.some((c) => c.path.endsWith('/login'))).toBe(false);
});

test('an expired saved session is ignored', () => {
  sessionStorage.setItem('tmk-feedback-session', JSON.stringify({ token: 'signed.token', expiresAt: Date.now() - 1 }));
  view();
  expect(screen.getByLabelText(/feedback admin key/i)).toBeInTheDocument();
});

test('filters by status, type and search words', async () => {
  const user = userEvent.setup();
  view();
  await signIn(user);
  await user.click(screen.getByRole('button', { name: /^1\s*Read/ }));
  await waitFor(() => expect(lastList().search).toContain('status=read'));
  expect(await screen.findByText('How do I get an upload key?')).toBeInTheDocument();
  expect(screen.queryByText('Please add a dark mode')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /^3\s*All/ }));
  await user.selectOptions(screen.getByLabelText(/filter by type/i), 'bug');
  await waitFor(() => expect(lastList().search).toContain('kind=bug'));
  expect(await screen.findByText('Login button broken on my phone')).toBeInTheDocument();
  expect(screen.queryByText('Please add a dark mode')).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText(/filter by type/i), 'all');
  await user.type(screen.getByLabelText(/search feedback/i), 'dark');
  await waitFor(() => expect(lastList().search).toContain('q=dark'));
  expect(await screen.findByText('Please add a dark mode')).toBeInTheDocument();
});

test('marking feedback resolved updates the card and the counts', async () => {
  const user = userEvent.setup();
  view();
  await signIn(user);
  await user.click(within(card('Please add a dark mode')).getByRole('button', { name: /resolve/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /^1\s*Resolved/ })).toBeInTheDocument());
  expect(screen.getByRole('button', { name: /^1\s*New/ })).toBeInTheDocument();
  expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ path: '/api/feedback-admin/feedbacks/a2', body: { status: 'resolved' }, auth: 'Bearer signed.token' });
  expect(within(card('Please add a dark mode')).getByText('Resolved')).toBeInTheDocument();
});

test('deleting asks for confirmation first', async () => {
  const user = userEvent.setup();
  view();
  await signIn(user);
  await user.click(within(card('Please add a dark mode')).getByRole('button', { name: /delete feedback/i }));
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  await user.click(screen.getByRole('button', { name: /cancel/i }));
  await user.click(within(card('Please add a dark mode')).getByRole('button', { name: /delete feedback/i }));
  await user.click(screen.getByRole('button', { name: /yes, delete/i }));
  await waitFor(() => expect(screen.queryByText('Please add a dark mode')).not.toBeInTheDocument());
  expect(calls.find((c) => c.method === 'DELETE').path).toBe('/api/feedback-admin/feedbacks/a2');
  expect(screen.getByRole('button', { name: /^2\s*All/ })).toBeInTheDocument();
});

test('if the session expires the visitor is sent back to sign in', async () => {
  const user = userEvent.setup();
  view();
  await signIn(user);
  expireNext = true;
  await user.click(screen.getByRole('button', { name: /refresh/i }));
  expect(await screen.findByRole('status')).toHaveTextContent(/session expired/i);
  expect(screen.getByLabelText(/feedback admin key/i)).toBeInTheDocument();
  expect(sessionStorage.getItem('tmk-feedback-session')).toBeNull();
});

test('Sign out forgets the session and hides every message', async () => {
  const user = userEvent.setup();
  view();
  await signIn(user);
  await user.click(screen.getByRole('button', { name: /sign out/i }));
  expect(screen.getByLabelText(/feedback admin key/i)).toBeInTheDocument();
  expect(screen.queryByText('Please add a dark mode')).not.toBeInTheDocument();
  expect(sessionStorage.getItem('tmk-feedback-session')).toBeNull();
});
