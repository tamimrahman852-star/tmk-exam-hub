import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Feedback from './Feedback.jsx';

const view = (url = '/feedback') => render(<MemoryRouter initialEntries={[url]}><Feedback /></MemoryRouter>);
let posted;
beforeEach(() => {
  posted = null;
  globalThis.fetch = vi.fn(async (url, opts) => { posted = { url: String(url), method: opts.method, body: JSON.parse(opts.body) }; return { ok: true, status: 201, json: async () => ({ ok: true }) }; });
});

test('too-short messages are rejected without calling the server', async () => {
  const user = userEvent.setup();
  view();
  await user.type(screen.getByLabelText(/your message/i), 'hi');
  await user.click(screen.getByRole('button', { name: /send feedback/i }));
  expect(screen.getByRole('alert')).toHaveTextContent(/at least a few words/i);
  expect(fetch).not.toHaveBeenCalled();
});

test('sends the type, message and optional details, then says thank you', async () => {
  const user = userEvent.setup();
  view('/feedback?from=%2Fexam%2Fchem-1');
  await user.click(screen.getByRole('button', { name: /suggestion/i }));
  await user.type(screen.getByLabelText(/your message/i), '  Please add a dark mode  ');
  await user.type(screen.getByLabelText(/^name/i), 'Rahim');
  await user.type(screen.getByLabelText(/email or phone/i), '01700000000');
  expect(screen.getByText('26 / 2000')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /send feedback/i }));

  expect(await screen.findByRole('heading', { name: /thank you/i })).toBeInTheDocument();
  expect(posted).toMatchObject({ url: '/api/feedback', method: 'POST', body: { kind: 'suggestion', message: 'Please add a dark mode', name: 'Rahim', contact: '01700000000', page: '/exam/chem-1', website: '' } });
  expect(screen.getByText(/only the site admin can read it/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /send another/i }));
  expect(screen.getByLabelText(/your message/i)).toHaveValue('');
});

test('only same-site paths are accepted as the "from" page', async () => {
  const user = userEvent.setup();
  view('/feedback?from=https%3A%2F%2Fevil.example');
  await user.type(screen.getByLabelText(/your message/i), 'Something is broken here');
  await user.click(screen.getByRole('button', { name: /send feedback/i }));
  await screen.findByRole('heading', { name: /thank you/i });
  expect(posted.body.page).toBe('');
});

test('the hidden honeypot field exists, is empty and is not reachable by keyboard', () => {
  view();
  const trap = document.querySelector('input[name="website"]');
  expect(trap).toBeTruthy();
  expect(trap.value).toBe('');
  expect(trap.tabIndex).toBe(-1);
  expect(trap.closest('[aria-hidden="true"]')).toBeTruthy();
});

test('shows the server error and keeps what was typed', async () => {
  const user = userEvent.setup();
  globalThis.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ error: 'You have sent a lot of feedback recently. Please try again later.' }) }));
  view();
  await user.type(screen.getByLabelText(/your message/i), 'A perfectly fine message');
  await user.click(screen.getByRole('button', { name: /send feedback/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/lot of feedback/i);
  expect(screen.getByLabelText(/your message/i)).toHaveValue('A perfectly fine message');
});
