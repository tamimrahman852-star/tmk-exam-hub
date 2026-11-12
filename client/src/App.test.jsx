import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App.jsx';

const at = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.scrollTo = vi.fn(); globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })); });

test('the old /admin address now leads to the protected upload page', () => {
  at('/admin');
  expect(screen.getByRole('heading', { name: /upload questions/i })).toBeInTheDocument();
  expect(screen.queryByText(/create an exam/i)).not.toBeInTheDocument();
});

test('the navbar Create link goes to the upload gate', () => {
  at('/about');
  expect(screen.getByRole('link', { name: /^create$/i })).toHaveAttribute('href', '/upload-exam');
});

test('/about, /feedback and /admin/feedbacks exist and the feedback inbox needs a key', () => {
  const a = at('/about'); expect(screen.getByRole('heading', { name: 'Tamim Rahman' })).toBeInTheDocument(); a.unmount();
  const b = at('/feedback'); expect(screen.getByRole('heading', { name: /send feedback/i })).toBeInTheDocument(); b.unmount();
  at('/admin/feedbacks');
  expect(screen.getByRole('heading', { name: /feedback inbox/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/feedback admin key/i)).toBeInTheDocument();
});

test('the footer links to About and to Feedback (remembering which page the visitor was on)', () => {
  at('/exam/chem-1?x=1');
  const nav = screen.getByRole('navigation', { name: 'Footer' });
  expect(nav).toHaveTextContent('About');
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
  expect(screen.getByRole('link', { name: 'Feedback' })).toHaveAttribute('href', '/feedback?from=%2Fexam%2Fchem-1');
});
