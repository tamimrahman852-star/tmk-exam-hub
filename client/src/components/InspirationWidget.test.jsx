import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import InspirationWidget from './InspirationWidget.jsx';

beforeEach(() => localStorage.clear());

test('shows the quote from the Quotable API when it responds', async () => {
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ content: 'API quote text', author: 'API Author' }) }));
  render(<InspirationWidget />);
  expect(await screen.findByText(/API quote text/)).toBeInTheDocument();
  expect(screen.getByText('API Author')).toBeInTheDocument();
  expect(screen.getByText(/via Quotable/i)).toBeInTheDocument();
  expect(String(fetch.mock.calls[0][0])).toContain('api.quotable.io');
});

test('falls back to a built-in quote when the API is down, and New quote still changes it', async () => {
  const user = userEvent.setup();
  globalThis.fetch = vi.fn(async () => { throw new Error('offline'); });
  const { container } = render(<InspirationWidget />);
  const first = container.querySelector('blockquote p').textContent;
  expect(first.length).toBeGreaterThan(10);
  expect(screen.queryByText(/via Quotable/i)).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /new quote/i }));
  await waitFor(() => expect(container.querySelector('blockquote p').textContent).not.toBe(first));
});

test('shows an Arabic dua with its Quran reference and a Next dua button', async () => {
  globalThis.fetch = vi.fn(async () => { throw new Error('offline'); });
  const user = userEvent.setup();
  const { container } = render(<InspirationWidget />);
  const ar = container.querySelector('[lang="ar"]');
  expect(ar.getAttribute('dir')).toBe('rtl');
  expect(screen.getByText(/Surah .* · \d+:\d+/)).toBeInTheDocument();
  const before = ar.textContent;
  await user.click(screen.getByRole('button', { name: /next dua/i }));
  expect(container.querySelector('[lang="ar"]').textContent).not.toBe(before);
});
