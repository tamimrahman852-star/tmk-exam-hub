import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import UploadExam from './UploadExam.jsx';

const json = (status, data) => ({ ok: status < 400, status, json: async () => data });
let calls;
const view = () => render(<MemoryRouter><UploadExam /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); calls = [];
  globalThis.fetch = vi.fn(async (url, opts = {}) => {
    calls.push({ url: String(url), key: opts.headers?.['x-admin-key'] });
    if (opts.headers?.['x-admin-key'] === 'throttled') return json(429, { error: 'Too many wrong keys. Please try again in 15 minutes.' });
    return opts.headers?.['x-admin-key'] === 'good-key' ? json(200, { ok: true }) : json(401, { error: 'Invalid admin key' });
  });
});

test('regular visitors only see the gate: no question form, and a way to ask for a key', () => {
  view();
  expect(screen.getByRole('heading', { name: /upload questions/i })).toBeInTheDocument();
  expect(screen.queryByText(/create an exam/i)).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText(/exam title/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /whatsapp · 01762324527/i }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/8801762324527\?text=.*Upload%20Key/);
  expect(screen.getByRole('link', { name: /gmail · tamimrahman852@gmail\.com/i }).getAttribute('href')).toMatch(/^mailto:tamimrahman852@gmail\.com\?subject=/);
  expect(fetch).not.toHaveBeenCalled();
});

test('a wrong key keeps the form locked and stores nothing', async () => {
  const user = userEvent.setup();
  view();
  await user.type(screen.getByLabelText(/question upload key/i), 'wrong-key');
  await user.click(screen.getByRole('button', { name: /unlock upload form/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/not correct/i);
  expect(screen.queryByText(/create an exam/i)).not.toBeInTheDocument();
  expect(sessionStorage.length).toBe(0);
  expect(localStorage.length).toBe(0);
});

test('an empty key is rejected before any request is made', async () => {
  const user = userEvent.setup();
  view();
  await user.click(screen.getByRole('button', { name: /unlock upload form/i }));
  expect(screen.getByRole('alert')).toHaveTextContent(/enter the upload key/i);
  expect(fetch).not.toHaveBeenCalled();
});

test('the server\'s lockout message is shown', async () => {
  const user = userEvent.setup();
  view();
  await user.type(screen.getByLabelText(/question upload key/i), 'throttled');
  await user.click(screen.getByRole('button', { name: /unlock upload form/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/too many wrong keys/i);
});

test('the correct key is checked by the server, unlocks the form and is kept for this tab only', async () => {
  const user = userEvent.setup();
  view();
  const input = screen.getByLabelText(/question upload key/i);
  expect(input).toHaveAttribute('type', 'password');
  await user.type(input, 'good-key');
  await user.click(screen.getByRole('button', { name: /unlock upload form/i }));

  expect(await screen.findByText(/upload access unlocked/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /create an exam/i })).toBeInTheDocument();
  expect(calls[0]).toEqual({ url: '/api/admin/check', key: 'good-key' });
  expect(screen.queryByPlaceholderText(/admin key/i)).not.toBeInTheDocument();      // no second key box inside the form
  expect(sessionStorage.getItem('tmk-upload-key')).toBe('good-key');
  expect(localStorage.getItem('tmk-admin-key')).toBeNull();                          // never written to long-term storage
});

test('Lock puts the gate back and forgets the key', async () => {
  const user = userEvent.setup();
  sessionStorage.setItem('tmk-upload-key', 'good-key');
  view();
  await user.click(await screen.findByRole('button', { name: /^lock$/i }));
  expect(screen.getByRole('heading', { name: /upload questions/i })).toBeInTheDocument();
  expect(sessionStorage.getItem('tmk-upload-key')).toBeNull();
});

test('a saved key is re-checked on return; an outdated one sends the visitor back to the gate', async () => {
  sessionStorage.setItem('tmk-upload-key', 'old-key');
  view();
  expect(await screen.findByRole('alert')).toHaveTextContent(/no longer valid/i);
  expect(sessionStorage.getItem('tmk-upload-key')).toBeNull();
  expect(screen.queryByText(/create an exam/i)).not.toBeInTheDocument();
});

test('the page asks search engines not to index it', () => {
  const { unmount } = view();
  expect(document.head.querySelector('meta[name="robots"]')?.content).toBe('noindex,nofollow');
  unmount();
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});
